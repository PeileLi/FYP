package com.fyp.backend.service;

import com.fyp.backend.dto.CampaignResponse;
import com.fyp.backend.dto.CreateCampaignRequest;
import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;
    private final FabricGatewayService fabricGatewayService;
    private final BlockchainVerificationService verificationService;
    private final DataAuditService dataAuditService;

    @Transactional
    public CampaignResponse createCampaign(CreateCampaignRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Campaign campaign = Campaign.builder()
                .title("Campaign #" + System.currentTimeMillis()) // Auto-generated title
                .category(request.getCategory())
                .description(request.getDescription())
                .goalAmount(request.getGoalAmount())
                .currentAmount(BigDecimal.ZERO)
                .status("PENDING") // Awaiting admin review
                .imageUrl(request.getImageUrl())
                .organizer(user)
                .build();

        Campaign savedCampaign = campaignRepository.save(campaign);

        // Auto-upgrade regular USER to INITIATOR on first campaign creation
        if (user.getRole() == User.Role.USER) {
            user.setRole(User.Role.INITIATOR);
            userRepository.save(user);
        }
        
        // Save to blockchain — status = PENDING_REVIEW, awaiting third-party audit
        try {
            if (fabricGatewayService.isEnabled()) {
                String initiator = user.getUsername();
                double goalAmount = savedCampaign.getGoalAmount().doubleValue();
                String dataHash = computeCampaignDataHash(savedCampaign);
                
                String txId = fabricGatewayService.createCampaign(
                        initiator, goalAmount,
                        "THIRD_PARTY",
                        "",
                        dataHash);
                
                if (txId != null && !txId.isEmpty()) {
                    savedCampaign.setBlockchainCampaignId(txId);
                    savedCampaign.setBlockchainTxId(txId);
                    savedCampaign = campaignRepository.save(savedCampaign);
                }
            }
        } catch (Exception e) {
            log.error("Failed to save campaign to blockchain (campaign still saved in DB): {}", e.getMessage());
        }
        
        return mapToResponse(savedCampaign);
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> getAllActiveCampaigns() {
        return campaignRepository.findByStatus("ACTIVE").stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> getAllCampaigns() {
        return campaignRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CampaignResponse getCampaignById(Long id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));
        return mapToResponse(campaign);
    }

    /**
     * Get campaign by blockchain transaction ID (database lookup only).
     * 通过区块链交易ID查询项目（仅查库）。
     */
    @Transactional(readOnly = true)
    public CampaignResponse getCampaignByBlockchainTxId(String txId) {
        Campaign campaign = campaignRepository.findByBlockchainTxId(txId);
        if (campaign != null) {
            return mapToResponse(campaign);
        }
        throw new RuntimeException("Campaign not found in database with blockchain transaction ID: " + txId);
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> getCampaignsByCategory(String category) {
        return campaignRepository.findByCategoryAndStatus(category, "ACTIVE").stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateCampaignAmount(Long campaignId, BigDecimal donationAmount) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));

        BigDecimal newAmount = campaign.getCurrentAmount().add(donationAmount);
        campaign.setCurrentAmount(newAmount);

        // Check if goal reached
        if (newAmount.compareTo(campaign.getGoalAmount()) >= 0) {
            campaign.setStatus("COMPLETED");
            if (campaign.getCompletedAt() == null) {
                campaign.setCompletedAt(java.time.LocalDateTime.now());
            }
            
            try {
                String bcId = ensureBlockchainRecord(campaign);
                if (bcId != null) {
                    fabricGatewayService.updateCampaignStatus(bcId, "COMPLETED");
                }
            } catch (Exception e) {
                log.error("Failed to update campaign status on blockchain: {}", e.getMessage());
            }
        }

        campaignRepository.save(campaign);
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> getUserCampaigns(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return campaignRepository.findAll().stream()
                .filter(campaign -> campaign.getOrganizer().getId().equals(user.getId()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CampaignResponse closeCampaign(Long campaignId, String username) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Check if user is the organizer
        if (!campaign.getOrganizer().getId().equals(user.getId())) {
            throw new RuntimeException("Only the campaign organizer can close the campaign");
        }
        
        // Check if campaign is already completed
        if ("COMPLETED".equals(campaign.getStatus()) || "CLOSED".equals(campaign.getStatus())) {
            throw new RuntimeException("Campaign is already closed or completed");
        }
        
        // Close the campaign
        campaign.setStatus("CLOSED");
        if (campaign.getCompletedAt() == null) {
            campaign.setCompletedAt(java.time.LocalDateTime.now());
        }
        
        try {
            String bcId = ensureBlockchainRecord(campaign);
            if (bcId != null) {
                fabricGatewayService.updateCampaignStatus(bcId, "SUSPENDED");
            }
        } catch (Exception e) {
            log.error("Failed to update campaign status on blockchain: {}", e.getMessage());
        }
        
        Campaign savedCampaign = campaignRepository.save(campaign);
        return mapToResponse(savedCampaign);
    }

    /**
     * Syncs the full campaign data (goalAmount, dataHash) to blockchain using
     * the UpdateCampaign chaincode function, which archives the old version.
     * Call this whenever campaign detail fields change after initial creation.
     */
    @Transactional
    public void syncCampaignDataToBlockchain(Campaign campaign) {
        String chainId = resolveBlockchainCampaignId(campaign);
        if (chainId == null || !fabricGatewayService.isEnabled()) return;

        try {
            String newDataHash = computeCampaignDataHash(campaign);
            fabricGatewayService.updateCampaign(
                    chainId,
                    campaign.getGoalAmount().doubleValue(),
                    "THIRD_PARTY",
                    "",
                    newDataHash);
            log.info("Campaign {} data synced to blockchain (dataHash updated)", campaign.getId());
        } catch (Exception e) {
            log.warn("Failed to sync campaign {} data to blockchain: {}", campaign.getId(), e.getMessage());
        }
    }

    /**
     * Resolve the blockchain campaign ID for a given campaign.
     * Uses the dedicated blockchainCampaignId field.
     */
    public static String resolveBlockchainCampaignId(Campaign campaign) {
        if (campaign.getBlockchainCampaignId() != null && !campaign.getBlockchainCampaignId().isEmpty()) {
            return campaign.getBlockchainCampaignId();
        }
        return null;
    }

    /**
     * Ensures a campaign has a blockchain record. If the campaign was created
     * when blockchain was unavailable, this creates the record retroactively.
     * Returns the blockchain campaign ID, or null if blockchain is disabled.
     */
    @Transactional
    public String ensureBlockchainRecord(Campaign campaign) {
        String existing = resolveBlockchainCampaignId(campaign);
        if (existing != null) {
            return existing;
        }

        if (!fabricGatewayService.isEnabled()) {
            return null;
        }

        try {
            String initiator = campaign.getOrganizer() != null
                    ? campaign.getOrganizer().getUsername() : "unknown";
            double goalAmount = campaign.getGoalAmount().doubleValue();
            String dataHash = computeCampaignDataHash(campaign);

            String txId = fabricGatewayService.createCampaign(
                    initiator, goalAmount, "THIRD_PARTY", "", dataHash);

            if (txId != null && !txId.isEmpty()) {
                campaign.setBlockchainCampaignId(txId);
                campaign.setBlockchainTxId(txId);
                campaignRepository.save(campaign);
                log.info("Retroactively recorded campaign {} on blockchain: txId={}",
                        campaign.getId(), txId);
                return txId;
            }
        } catch (Exception e) {
            log.error("Failed to retroactively record campaign {} on blockchain: {}",
                    campaign.getId(), e.getMessage());
        }
        return null;
    }

    /**
     * Compute SHA-256 hash of the off-chain detail fields that are anchored
     * on the blockchain via the dataHash field.
     */
    public static String computeCampaignDataHash(Campaign campaign) {
        String data = nullSafe(campaign.getTitle()) + "|" +
                      nullSafe(campaign.getDescription()) + "|" +
                      nullSafe(campaign.getCategory()) + "|" +
                      nullSafe(campaign.getImageUrl());
        return sha256Hex(data);
    }

    public static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 computation failed", e);
        }
    }

    private static String nullSafe(String s) {
        return s != null ? s : "";
    }

    private CampaignResponse mapToResponse(Campaign campaign) {
        boolean isVerified = false;
        String verificationStatus = "NOT_VERIFIED";
        
        if (campaign.getBlockchainTxId() != null && fabricGatewayService.isEnabled()) {
            try {
                BlockchainVerificationService.CompleteVerificationResult result = 
                    verificationService.verifyComplete(campaign);
                isVerified = result.isVerified();
                verificationStatus = result.getStatus();
            } catch (Exception e) {
                verificationStatus = "VERIFICATION_FAILED";
            }
        } else if (campaign.getBlockchainTxId() == null) {
            verificationStatus = "NOT_RECORDED";
        }
        
        boolean hasTamperingHistory = dataAuditService.hasTamperingHistory(campaign.getId());
        int tamperingCount = (int) dataAuditService.getCampaignAuditHistory(campaign.getId())
            .stream()
            .filter(auditLog -> "TAMPERED".equals(auditLog.getVerificationStatus()))
            .count();
        
        return CampaignResponse.builder()
                .id(campaign.getId())
                .title(campaign.getTitle())
                .category(campaign.getCategory())
                .description(campaign.getDescription())
                .goalAmount(campaign.getGoalAmount())
                .currentAmount(campaign.getCurrentAmount())
                .status(campaign.getStatus())
                .imageUrl(campaign.getImageUrl())
                .organizerName(campaign.getOrganizer().getDisplayName())
                .organizerId(campaign.getOrganizer().getId())
                .createdAt(campaign.getCreatedAt())
                .updatedAt(campaign.getUpdatedAt())
                .completedAt(campaign.getCompletedAt())
                .blockchainTxId(campaign.getBlockchainTxId())
                .dataVerified(isVerified)
                .verificationStatus(verificationStatus)
                .hasTamperingHistory(hasTamperingHistory)
                .tamperingIncidentCount(tamperingCount)
                .auditStatus(campaign.getAuditStatus())
                .partnerEndorsed(Boolean.TRUE.equals(campaign.getPartnerEndorsed()))
                .partnerNote(campaign.getPartnerNote())
                .endorsedBy(campaign.getEndorsedBy() != null ? campaign.getEndorsedBy().getDisplayName() : null)
                .endorsedAt(campaign.getEndorsedAt())
                .build();
    }
}
