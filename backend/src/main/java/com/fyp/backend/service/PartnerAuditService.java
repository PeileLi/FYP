package com.fyp.backend.service;

import com.fyp.backend.model.AuditTask;
import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.CampaignAudit;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.AuditTaskRepository;
import com.fyp.backend.repository.CampaignAuditRepository;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerAuditService {

    private static final Set<String> VALID_CONCLUSIONS =
            Set.of("APPROVED", "REJECTED", "REQUIRES_INFO", "RISK_FLAGGED");

    private final CampaignRepository campaignRepository;
    private final CampaignAuditRepository auditRepository;
    private final UserRepository userRepository;
    private final FabricGatewayService fabricGatewayService;
    private final PartnerFabricGatewayService partnerFabricGatewayService;
    private final CampaignService campaignService;
    private final AuditTaskService auditTaskService;
    private final AuditTaskRepository auditTaskRepository;
    private final PartnerScopeService scopeService;

    /**
     * Returns only campaigns that have a task scoped to the current partner:
     *  - OPEN tasks (any partner may see, with basic info)
     *  - Tasks ACCEPTED/COMPLETED by the current partner (full info)
     * Filtered further by auditStatus if provided.
     */
    public List<Map<String, Object>> getCampaigns(String auditStatus) {
        User me = scopeService.currentPartner();

        // Collect OPEN task campaigns
        List<Campaign> openCampaigns = auditTaskRepository
                .findByStatusOrderByCreatedAtAsc(AuditTask.Status.OPEN)
                .stream().map(t -> t.getCampaign()).toList();

        // Collect campaigns where I'm the assigned partner
        List<Campaign> myCampaigns = auditTaskRepository
                .findByAssignedPartner(me)
                .stream().map(t -> t.getCampaign()).toList();

        // Union, dedup by id
        Map<Long, Campaign> all = new java.util.LinkedHashMap<>();
        myCampaigns.forEach(c -> all.put(c.getId(), c));
        openCampaigns.forEach(c -> all.putIfAbsent(c.getId(), c));

        return all.values().stream()
                .filter(c -> auditStatus == null || auditStatus.isBlank()
                          || auditStatus.equals(c.getAuditStatus()))
                .sorted(java.util.Comparator.comparing(Campaign::getId).reversed())
                .map(c -> {
                    var latest = auditRepository.findTopByCampaignOrderByCreatedAtDesc(c).orElse(null);
                    // Attach scope level for each campaign
                    PartnerScopeService.ScopeLevel scope = scopeService.scopeFor(c.getId(), me);
                    Map<String, Object> m = toCampaignMap(c, latest);
                    m.put("scopeLevel", scope.name());
                    return m;
                }).toList();
    }

    @Transactional
    public Map<String, Object> submitAudit(Long campaignId, String conclusion,
                                           String evidenceSummary, String notes) {
        if (!VALID_CONCLUSIONS.contains(conclusion)) {
            throw new RuntimeException("Invalid conclusion: " + conclusion);
        }
        scopeService.requireFullAccess(campaignId);
        User partner = scopeService.currentPartner();
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        campaign.setAuditStatus(conclusion);
        if ("APPROVED".equals(conclusion)) {
            campaign.setPartnerEndorsed(true);
            campaign.setEndorsedBy(partner);
            campaign.setEndorsedAt(LocalDateTime.now());
            campaign.setPartnerNote(evidenceSummary);
            campaign.setStatus("ACTIVE");
        } else if ("RISK_FLAGGED".equals(conclusion) || "REJECTED".equals(conclusion)) {
            campaign.setPartnerEndorsed(false);
            campaign.setStatus("SUSPENDED");
        }
        campaignRepository.save(campaign);

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        // Auto-compute hashes from off-chain text fields
        String evidenceHash = CampaignService.sha256Hex(evidenceSummary != null ? evidenceSummary : "");
        String commentHash = CampaignService.sha256Hex(
                (evidenceSummary != null ? evidenceSummary : "") + "|" +
                (notes != null ? notes : ""));

        CampaignAudit audit = CampaignAudit.builder()
                .campaign(campaign)
                .auditor(partner)
                .conclusion(conclusion)
                .evidenceSummary(evidenceSummary)
                .evidenceHash(evidenceHash)
                .notes(notes)
                .build();

        String blockchainAuditId = null;
        String campaignChainId = campaignService.ensureBlockchainRecord(campaign);
        try {
            if (campaignChainId != null) {
                if (partnerFabricGatewayService.isOrg2Ready()) {
                    blockchainAuditId = partnerFabricGatewayService.submitReviewResult(
                            campaignChainId,
                            partner.getDisplayName(),
                            conclusion,
                            evidenceHash,
                            commentHash,
                            timestamp);
                    log.info("SubmitReviewResult [Org2MSP] OK: {} for campaign {}", blockchainAuditId, campaignId);
                    audit.setSignedBy("ORG2_VERIFIED");
                } else {
                    log.warn("Org2 gateway not ready — falling back to RecordAudit via Org1MSP for campaign {}", campaignId);
                    blockchainAuditId = fabricGatewayService.recordAudit(
                            campaignChainId,
                            partner.getDisplayName(),
                            conclusion,
                            evidenceHash,
                            commentHash,
                            timestamp);
                    log.info("RecordAudit [Org1MSP fallback] OK: {} for campaign {}", blockchainAuditId, campaignId);
                    audit.setSignedBy("ORG1_TEMPORARY");
                    audit.setPendingOrg2Resubmit(true);
                }
                audit.setBlockchainAuditId(blockchainAuditId);
            }
        } catch (Exception e) {
            log.warn("Failed to record audit on blockchain (DB record will still be saved): {}", e.getMessage());
        }

        // Sync campaign status to blockchain after audit is recorded
        if ("APPROVED".equals(conclusion) && campaignChainId != null && fabricGatewayService.isEnabled()) {
            try {
                fabricGatewayService.approveCampaign(campaignChainId, partner.getDisplayName(), timestamp);
                log.info("Campaign {} approved on-chain after partner audit", campaignId);
            } catch (Exception e) {
                log.warn("ApproveCampaign failed — reverting DB status for campaign {}: {}", campaignId, e.getMessage());
                campaign.setStatus("PENDING");
                campaignRepository.save(campaign);
            }
        }

        auditRepository.save(audit);

        if (!"REQUIRES_INFO".equals(conclusion)) {
            try { auditTaskService.completeTaskForCampaign(campaignId, partner); } catch (Exception e) {
                log.warn("Could not mark audit task as completed: {}", e.getMessage());
            }
        }

        return toAuditMap(audit, campaign);
    }

    public List<Map<String, Object>> getAuditHistory(Long campaignId) {
        scopeService.requireFullAccess(campaignId);
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        List<Map<String, Object>> dbRecords = auditRepository
                .findByCampaignOrderByCreatedAtDesc(campaign)
                .stream().map(a -> toAuditMap(a, campaign)).toList();

        // Cross-check with on-chain audit records when available
        String chainId = CampaignService.resolveBlockchainCampaignId(campaign);
        if (chainId != null && fabricGatewayService.isEnabled()) {
            try {
                String chainReviews = fabricGatewayService.queryReviews(chainId);
                if (chainReviews != null && !chainReviews.isBlank()) {
                    var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    var chainNodes = mapper.readTree(chainReviews);
                    int chainCount = chainNodes.isArray() ? chainNodes.size() : 0;

                    for (Map<String, Object> rec : dbRecords) {
                        String bcAuditId = (String) rec.get("blockchainAuditId");
                        if (bcAuditId != null && chainNodes.isArray()) {
                            boolean foundOnChain = false;
                            for (var node : chainNodes) {
                                if (bcAuditId.equals(node.path("auditId").asText(""))) {
                                    foundOnChain = true;
                                    String chainConclusion = node.path("conclusion").asText("");
                                    String dbConclusion = (String) rec.get("conclusion");
                                    rec.put("chainVerified", chainConclusion.equals(dbConclusion));
                                    rec.put("chainConclusion", chainConclusion);
                                    break;
                                }
                            }
                            if (!foundOnChain) {
                                rec.put("chainVerified", false);
                                rec.put("chainConclusion", "NOT_FOUND_ON_CHAIN");
                            }
                        } else {
                            rec.put("chainVerified", false);
                            rec.put("chainConclusion", null);
                        }
                    }

                    // Append summary of on-chain count vs DB count
                    long dbOnChainCount = dbRecords.stream()
                            .filter(r -> r.get("blockchainAuditId") != null).count();
                    if (chainCount != dbOnChainCount) {
                        log.warn("Audit record count mismatch for campaign {}: chain={}, dbOnChain={}",
                                campaignId, chainCount, dbOnChainCount);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to cross-check audit history with blockchain for campaign {}: {}",
                        campaignId, e.getMessage());
            }
        }

        return dbRecords;
    }

    private Map<String, Object> toCampaignMap(Campaign c, CampaignAudit latestAudit) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("title", c.getTitle());
        m.put("category", c.getCategory());
        m.put("status", c.getStatus());
        m.put("auditStatus", c.getAuditStatus());
        m.put("goalAmount", c.getGoalAmount());
        m.put("currentAmount", c.getCurrentAmount());
        m.put("organizer", c.getOrganizer() != null ? c.getOrganizer().getDisplayName() : "—");
        m.put("organizerUsername", c.getOrganizer() != null ? c.getOrganizer().getUsername() : "—");
        m.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
        m.put("description", c.getDescription());
        m.put("partnerEndorsed", Boolean.TRUE.equals(c.getPartnerEndorsed()));
        m.put("endorsedBy", c.getEndorsedBy() != null ? c.getEndorsedBy().getDisplayName() : null);
        m.put("blockchainTxId", c.getBlockchainTxId());
        m.put("latestAuditConclusion", latestAudit != null ? latestAudit.getConclusion() : null);
        m.put("latestAuditAt", latestAudit != null ? latestAudit.getCreatedAt().toString() : null);
        return m;
    }

    private Map<String, Object> toAuditMap(CampaignAudit a, Campaign c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("campaignId", c.getId());
        m.put("campaignTitle", c.getTitle());
        m.put("conclusion", a.getConclusion());
        m.put("evidenceSummary", a.getEvidenceSummary());
        m.put("evidenceHash", a.getEvidenceHash());
        m.put("notes", a.getNotes());
        m.put("auditor", a.getAuditor() != null ? a.getAuditor().getDisplayName() : "—");
        m.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : "");
        m.put("blockchainAuditId", a.getBlockchainAuditId());
        m.put("onChain", a.getBlockchainAuditId() != null);
        m.put("signedBy", a.getSignedBy());
        m.put("pendingOrg2Resubmit", Boolean.TRUE.equals(a.getPendingOrg2Resubmit()));
        return m;
    }
}
