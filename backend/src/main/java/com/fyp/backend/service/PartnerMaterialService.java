package com.fyp.backend.service;

import com.fyp.backend.model.*;
import com.fyp.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerMaterialService {

    private final CampaignRepository             campaignRepo;
    private final CampaignDocumentRepository     documentRepo;
    private final CampaignUpdateRepository       updateRepo;
    private final MaterialVerificationRepository verificationRepo;
    private final DonationRepository             donationRepo;
    private final PartnerScopeService            scopeService;
    private final FabricGatewayService           fabricGatewayService;
    private final CampaignAuditRepository        campaignAuditRepo;
    private final CampaignService                campaignService;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Campaign getCampaign(Long id) {
        return campaignRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + id));
    }

    // ── Read-only campaign detail (scope-aware) ───────────────────────────────

    /**
     * Returns full campaign detail for any authenticated partner with an open task.
     */
    public Map<String, Object> getCampaignDetail(Long campaignId) {
        scopeService.requireFullAccess(campaignId);
        Campaign c = getCampaign(campaignId);

        Map<String, Object> m = new LinkedHashMap<>();

        boolean fullAccess = true;

        // ── Visible to all in-scope partners (basic info) ────────────────────
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("id",              c.getId());
        info.put("title",           c.getTitle());
        info.put("category",        c.getCategory());
        info.put("status",          c.getStatus());
        info.put("auditStatus",     c.getAuditStatus());
        info.put("goalAmount",      c.getGoalAmount());
        info.put("currentAmount",   c.getCurrentAmount());
        info.put("createdAt",       c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
        info.put("blockchainTxId",  c.getBlockchainTxId());
        info.put("onChain",         c.getBlockchainTxId() != null);
        info.put("freezeReason",    c.getFreezeReason());
        info.put("unfreezeRequested", Boolean.TRUE.equals(c.getUnfreezeRequested()));
        // Organiser: display name visible to all; contact details only on full access
        Map<String, Object> org = new LinkedHashMap<>();
        if (c.getOrganizer() != null) {
            org.put("id",          c.getOrganizer().getId());
            org.put("displayName", c.getOrganizer().getDisplayName());
            if (fullAccess) {
                org.put("username", c.getOrganizer().getUsername());
                org.put("role",  c.getOrganizer().getRole().name());
            }
        }
        info.put("organizer", org);
        // Description is basic info — visible to all
        info.put("description", c.getDescription());
        m.put("basicInfo", info);
        m.put("scopeLevel", "FULL_ACCESS");

        // ── FULL_ACCESS only: materials ───────────────────────────────────────
        if (fullAccess) {
            m.put("fundUsagePlan", c.getFundUsagePlan());

            List<Map<String, Object>> docs = documentRepo.findByCampaignOrderByUploadedAtDesc(c)
                    .stream().map(this::toDocMap).toList();
            m.put("documents", docs);

            List<Map<String, Object>> updates = updateRepo.findByCampaignOrderByCreatedAtDesc(c)
                    .stream().map(this::toUpdateMap).toList();
            m.put("updates", updates);

            long donationCount = donationRepo.countByCampaignId(c.getId());
            m.put("donationCount", donationCount);

            m.put("completenessFlags", computeCompleteness(c, docs));
        } else {
            // Indicate restricted data with placeholders
            m.put("fundUsagePlan",     null);
            m.put("documents",         List.of());
            m.put("updates",           List.of());
            m.put("donationCount",     null);
            m.put("completenessFlags", Map.of());
            m.put("accessRestricted",  true);
            m.put("accessHint", "Accept this task to access full materials, documents, and fund-usage plan.");
        }

        // ── Audit history summary — visible to all in-scope partners ──────────
        verificationRepo.findTopByCampaignOrderByCreatedAtDesc(c).ifPresent(v ->
            m.put("latestVerification", toVerificationMap(v)));

        return m;
    }

    // ── Material verification ─────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> submitVerification(Long campaignId,
                                                  String checklistJson,
                                                  String overallNote,
                                                  String overallStatus) {
        scopeService.requireFullAccess(campaignId);
        User partner = scopeService.currentPartner();
        Campaign campaign = getCampaign(campaignId);

        if (!Set.of("PASS", "PARTIAL", "FAIL").contains(overallStatus)) {
            throw new IllegalArgumentException("Invalid overall status: " + overallStatus);
        }

        MaterialVerification v = MaterialVerification.builder()
                .campaign(campaign)
                .partner(partner)
                .checklist(checklistJson)
                .overallNote(overallNote)
                .overallStatus(overallStatus)
                .build();

        // Record material verification on blockchain
        try {
            String chainId = campaignService.ensureBlockchainRecord(campaign);
            if (chainId != null && fabricGatewayService.isEnabled()) {
                String timestamp = java.time.LocalDateTime.now()
                        .format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                String evidenceHash = CampaignService.sha256Hex(
                        checklistJson != null ? checklistJson : "");
                String commentHash = CampaignService.sha256Hex(
                        "MATERIAL_VERIFICATION|" + overallStatus + "|" +
                        (overallNote != null ? overallNote : ""));

                String conclusion = switch (overallStatus) {
                    case "PASS" -> "APPROVED";
                    case "FAIL" -> "REJECTED";
                    default     -> "REQUIRES_INFO";
                };

                String auditId = fabricGatewayService.recordAudit(
                        chainId, partner.getDisplayName(), conclusion,
                        evidenceHash, commentHash, timestamp);
                v.setBlockchainVerificationId(auditId);
                log.info("Material verification for campaign {} recorded on blockchain: {}",
                        campaignId, auditId);
            }
        } catch (Exception e) {
            log.warn("Failed to record material verification on blockchain for campaign {}: {}",
                    campaignId, e.getMessage());
        }

        verificationRepo.save(v);

        log.info("Partner {} submitted material verification for campaign {} — {}",
                partner.getUsername(), campaignId, overallStatus);
        return toVerificationMap(v);
    }

    public List<Map<String, Object>> getVerifications(Long campaignId) {
        scopeService.requireFullAccess(campaignId);
        Campaign c = getCampaign(campaignId);
        return verificationRepo.findByCampaignOrderByCreatedAtDesc(c)
                .stream().map(this::toVerificationMap).toList();
    }

    // ── Chain records (on-chain transactions & audit records) ─────────────────

    /**
     * Returns on-chain transaction and audit records for a campaign.
     * Visible to any in-scope partner (OPEN_VIEW or FULL_ACCESS).
     * Blockchain data is transparent by design.
     */
    public Map<String, Object> getChainRecords(Long campaignId) {
        scopeService.requireFullAccess(campaignId);
        Campaign c = getCampaign(campaignId);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("campaignId",          c.getId());
        m.put("blockchainTxId",      c.getBlockchainTxId());
        m.put("blockchainCampaignId",c.getBlockchainCampaignId());
        m.put("onChain",             c.getBlockchainTxId() != null);

        // DB-backed donation records (tx IDs)
        List<Map<String, Object>> donations = donationRepo
                .findByCampaignOrderByDonationDateDesc(c).stream()
                .filter(d -> d.getTransactionHash() != null)
                .map(d -> {
                    Map<String, Object> dm = new LinkedHashMap<>();
                    dm.put("donationId",     d.getId());
                    dm.put("amount",         d.getAmount());
                    dm.put("donor",          Boolean.TRUE.equals(d.getIsAnonymous()) ? "Anonymous" : d.getUser() != null ? d.getUser().getDisplayName() : "—");
                    dm.put("txHash",         d.getTransactionHash());
                    dm.put("donationDate",   d.getDonationDate() != null ? d.getDonationDate().toString() : "");
                    return dm;
                }).toList();
        m.put("donationTxRecords", donations);
        m.put("donationTxCount",   donations.size());

        // DB-backed audit records (blockchain audit IDs)
        List<Map<String, Object>> auditChain = campaignAuditRepo
                .findByCampaignOrderByCreatedAtDesc(c).stream()
                .filter(a -> a.getBlockchainAuditId() != null)
                .map(a -> {
                    Map<String, Object> am = new LinkedHashMap<>();
                    am.put("blockchainAuditId", a.getBlockchainAuditId());
                    am.put("conclusion",        a.getConclusion());
                    am.put("auditor",           a.getAuditor() != null ? a.getAuditor().getDisplayName() : "—");
                    am.put("createdAt",         a.getCreatedAt() != null ? a.getCreatedAt().toString() : "");
                    am.put("evidenceHash",      a.getEvidenceHash());
                    return am;
                }).toList();
        m.put("auditChainRecords",  auditChain);
        m.put("auditChainCount",    auditChain.size());

        // Live chaincode queries
        String chainId = c.getBlockchainCampaignId() != null ? c.getBlockchainCampaignId() : c.getBlockchainTxId();
        if (chainId != null) {
            try {
                String latestOnChain = fabricGatewayService.getLatestAuditRecord(chainId);
                m.put("latestOnChainAudit", latestOnChain);
            } catch (Exception ignored) { m.put("latestOnChainAudit", null); }
            try {
                String campaignOnChain = fabricGatewayService.readCampaignOnChain(chainId);
                m.put("campaignOnChainState", campaignOnChain);
            } catch (Exception ignored) { m.put("campaignOnChainState", null); }
            try {
                // QueryReviews — open to all MSPs, returns ALL review records with callerMsp
                String allReviews = fabricGatewayService.queryReviews(chainId);
                m.put("allReviewsOnChain", allReviews);
            } catch (Exception ignored) { m.put("allReviewsOnChain", null); }
            try {
                String approvalRec = fabricGatewayService.getApprovalRecord(chainId);
                m.put("approvalRecord", approvalRec);
            } catch (Exception ignored) { m.put("approvalRecord", null); }
        } else {
            m.put("latestOnChainAudit",   null);
            m.put("campaignOnChainState", null);
            m.put("allReviewsOnChain",    null);
            m.put("approvalRecord",       null);
            m.put("chainNote", "Campaign has not been recorded on-chain yet");
        }

        return m;
    }

    // ── Organiser: add document / update ─────────────────────────────────────
    // Partner users must have FULL_ACCESS; organiser/admin bypass scope check.

    @Transactional
    public Map<String, Object> addDocument(Long campaignId, String docType,
                                           String name, String url, String description) {
        scopeService.requireFullAccess(campaignId);
        Campaign c = getCampaign(campaignId);
        CampaignDocument.DocType type;
        try { type = CampaignDocument.DocType.valueOf(docType); }
        catch (IllegalArgumentException e) { type = CampaignDocument.DocType.OTHER; }

        CampaignDocument doc = CampaignDocument.builder()
                .campaign(c).docType(type).name(name).url(url).description(description).build();
        return toDocMap(documentRepo.save(doc));
    }

    @Transactional
    public Map<String, Object> addUpdate(Long campaignId, String content) {
        scopeService.requireFullAccess(campaignId);
        Campaign c = getCampaign(campaignId);
        CampaignUpdate u = CampaignUpdate.builder().campaign(c).content(content).build();
        return toUpdateMap(updateRepo.save(u));
    }

    @Transactional
    public void updateFundUsagePlan(Long campaignId, String plan) {
        scopeService.requireFullAccess(campaignId);
        Campaign c = getCampaign(campaignId);
        c.setFundUsagePlan(plan);
        campaignRepo.save(c);

        // Sync updated campaign data to blockchain
        try {
            campaignService.syncCampaignDataToBlockchain(c);
        } catch (Exception e) {
            log.warn("Failed to sync fund usage plan change to blockchain for campaign {}: {}",
                    campaignId, e.getMessage());
        }
    }

    // ── Completeness check ────────────────────────────────────────────────────

    private Map<String, Object> computeCompleteness(Campaign c, List<Map<String, Object>> docs) {
        Set<String> presentTypes = new HashSet<>();
        docs.forEach(d -> presentTypes.add((String) d.get("docType")));

        Map<String, Object> flags = new LinkedHashMap<>();
        flags.put("hasDescription",    c.getDescription() != null && !c.getDescription().isBlank());
        flags.put("hasFundUsagePlan",  c.getFundUsagePlan() != null && !c.getFundUsagePlan().isBlank());
        flags.put("hasIdentityDoc",    presentTypes.contains("IDENTITY"));
        flags.put("hasRegistration",   presentTypes.contains("REGISTRATION"));
        flags.put("hasBankDoc",        presentTypes.contains("BANK"));
        flags.put("hasSupportingDocs", !docs.isEmpty());
        flags.put("isOnChain",         c.getBlockchainTxId() != null);

        long passCount = flags.values().stream().filter(v -> Boolean.TRUE.equals(v)).count();
        flags.put("score", (int) passCount);
        flags.put("total", flags.size() - 1); // exclude score itself
        return flags;
    }

    // ── Serialisers ───────────────────────────────────────────────────────────

    private Map<String, Object> toDocMap(CampaignDocument d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          d.getId());
        m.put("docType",     d.getDocType().name());
        m.put("name",        d.getName());
        m.put("url",         d.getUrl());
        m.put("description", d.getDescription());
        m.put("uploadedAt",  d.getUploadedAt() != null ? d.getUploadedAt().toString() : "");
        return m;
    }

    private Map<String, Object> toUpdateMap(CampaignUpdate u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",        u.getId());
        m.put("content",   u.getContent());
        m.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : "");
        return m;
    }

    private Map<String, Object> toVerificationMap(MaterialVerification v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            v.getId());
        m.put("partner",       v.getPartner() != null ? v.getPartner().getDisplayName() : "—");
        m.put("overallStatus", v.getOverallStatus());
        m.put("overallNote",   v.getOverallNote());
        m.put("checklist",     v.getChecklist());
        m.put("createdAt",     v.getCreatedAt() != null ? v.getCreatedAt().toString() : "");
        m.put("blockchainVerificationId", v.getBlockchainVerificationId());
        return m;
    }
}
