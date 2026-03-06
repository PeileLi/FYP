package com.fyp.backend.service;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.DonationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignAdminService {

    private final CampaignRepository campaignRepository;
    private final DonationRepository donationRepository;
    private final FabricGatewayService fabricGatewayService;
    private final CampaignService campaignService;

    public List<Map<String, Object>> getAllCampaigns(String status, String keyword) {
        List<Campaign> campaigns;
        if ((status == null || status.isBlank()) && (keyword == null || keyword.isBlank())) {
            campaigns = campaignRepository.findAllByOrderByCreatedAtDesc();
        } else {
            campaigns = campaignRepository.searchAdmin(
                (status == null || status.isBlank()) ? null : status,
                (keyword == null || keyword.isBlank()) ? null : keyword
            );
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Campaign c : campaigns) {
            result.add(toMap(c));
        }
        return result;
    }

    @Transactional
    public Map<String, Object> updateStatus(Long campaignId, String newStatus) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        String oldStatus = campaign.getStatus();
        campaign.setStatus(newStatus);
        campaign.setUpdatedAt(LocalDateTime.now());

        if ("COMPLETED".equals(newStatus)) {
            campaign.setCompletedAt(LocalDateTime.now());
        }

        campaignRepository.save(campaign);

        // Sync to blockchain — create record retroactively if missing, then update
        if (fabricGatewayService.isEnabled()) {
            String chainId = campaignService.ensureBlockchainRecord(campaign);
            if (chainId != null) {
                String ts = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                try {
                    campaignService.syncCampaignDataToBlockchain(campaign);

                    if ("ACTIVE".equals(newStatus)) {
                        try {
                            fabricGatewayService.approveCampaign(chainId, "admin", ts);
                            log.info("ApproveCampaign chaincode called for campaign {}", campaignId);
                        } catch (Exception approveEx) {
                            log.error("ApproveCampaign failed — reverting DB status for campaign {}: {}",
                                    campaignId, approveEx.getMessage());
                            campaign.setStatus(oldStatus);
                            campaign.setUpdatedAt(LocalDateTime.now());
                            campaignRepository.save(campaign);
                            throw new RuntimeException(
                                    "Cannot approve campaign: blockchain ApproveCampaign failed (latest audit must be APPROVED). " +
                                    approveEx.getMessage());
                        }
                    } else {
                        String bcStatus = switch (newStatus) {
                            case "PENDING"   -> "PENDING_REVIEW";
                            case "SUSPENDED" -> "SUSPENDED";
                            case "COMPLETED" -> "COMPLETED";
                            case "CLOSED"    -> "SUSPENDED";
                            default          -> newStatus;
                        };
                        fabricGatewayService.updateCampaignStatus(chainId, bcStatus);
                        log.info("Blockchain status updated for campaign {}: {}", campaignId, bcStatus);
                    }
                } catch (RuntimeException re) {
                    throw re;
                } catch (Exception e) {
                    log.warn("Blockchain sync failed for campaign {} status={}: {}", campaignId, newStatus, e.getMessage());
                }
            }
        }

        log.info("Admin updated campaign {} status: {} → {}", campaignId, oldStatus, newStatus);
        return toMap(campaign);
    }

    private Map<String, Object> toMap(Campaign c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("title", c.getTitle());
        m.put("category", c.getCategory());
        m.put("description", c.getDescription() != null
                ? c.getDescription().substring(0, Math.min(120, c.getDescription().length()))
                : "");
        m.put("status", c.getStatus());
        m.put("statusLabel", toStatusLabel(c.getStatus()));
        m.put("goalAmount", c.getGoalAmount());
        m.put("currentAmount", c.getCurrentAmount());
        m.put("progress", c.getGoalAmount().compareTo(java.math.BigDecimal.ZERO) > 0
                ? c.getCurrentAmount().multiply(new java.math.BigDecimal("100"))
                    .divide(c.getGoalAmount(), 1, java.math.RoundingMode.HALF_UP)
                : java.math.BigDecimal.ZERO);
        m.put("imageUrl", c.getImageUrl());
        m.put("organizerName", c.getOrganizer() != null ? c.getOrganizer().getDisplayName() : "—");
        m.put("organizerUsername", c.getOrganizer() != null ? c.getOrganizer().getUsername() : "—");
        m.put("organizerId", c.getOrganizer() != null ? c.getOrganizer().getId() : null);
        m.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
        m.put("updatedAt", c.getUpdatedAt() != null ? c.getUpdatedAt().toString() : "");
        m.put("completedAt", c.getCompletedAt() != null ? c.getCompletedAt().toString() : null);
        m.put("onChain", c.getBlockchainTxId() != null);
        m.put("blockchainTxId", c.getBlockchainTxId());

        long donationCount = donationRepository.findByCampaignOrderByDonationDateDesc(c).size();
        m.put("donationCount", donationCount);

        return m;
    }

    private String toStatusLabel(String status) {
        return switch (status != null ? status : "") {
            case "PENDING"   -> "Pending Review";
            case "ACTIVE"    -> "Approved";
            case "SUSPENDED" -> "Suspended";
            case "COMPLETED" -> "Completed";
            case "CLOSED"    -> "Closed";
            default          -> status;
        };
    }

}
