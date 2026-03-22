package com.fyp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fyp.backend.model.Campaign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Verifies data integrity between the off-chain database and the on-chain
 * minimal trusted state. After the chaincode refactor the chain stores only
 * dataHash (SHA-256 of off-chain detail fields) plus a handful of governance
 * fields (goalAmount, status, version, …). This service recomputes the hash
 * from the current DB values and compares it with the on-chain anchor.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BlockchainVerificationService {

    private final FabricGatewayService fabricGatewayService;
    private final DataAuditService dataAuditService;

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class CompleteVerificationResult {
        private boolean verified;
        private String status; // VERIFIED | TAMPERED | NOT_RECORDED | VERIFICATION_FAILED
    }

    /**
     * Full verification: compare DB detail hash with on-chain dataHash.
     */
    public CompleteVerificationResult verifyComplete(Campaign campaign) {
        if (!fabricGatewayService.isEnabled()) {
            return new CompleteVerificationResult(false, "NOT_RECORDED");
        }
        if (campaign.getBlockchainTxId() == null) {
            return new CompleteVerificationResult(false, "NOT_RECORDED");
        }

        try {
            String bcCampaignId = CampaignService.resolveBlockchainCampaignId(campaign);
            if (bcCampaignId == null) {
                return new CompleteVerificationResult(false, "VERIFICATION_FAILED");
            }

            String blockchainData = fabricGatewayService.readCampaign(bcCampaignId);
            if (blockchainData == null || blockchainData.isEmpty()) {
                log.error("No blockchain data found for campaign {} (bcId={})", campaign.getId(), bcCampaignId);
                return new CompleteVerificationResult(false, "VERIFICATION_FAILED");
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(blockchainData);

            String onChainHash = root.path("dataHash").asText("");
            if (onChainHash.isEmpty()) {
                log.error("On-chain dataHash is empty for campaign {}", campaign.getId());
                return new CompleteVerificationResult(false, "VERIFICATION_FAILED");
            }

            // Recompute hash from current DB values
            String dbHash = CampaignService.computeCampaignDataHash(campaign);
            boolean hashMatches = dbHash.equals(onChainHash);

            if (!hashMatches) {
                log.error("TAMPERING DETECTED for campaign {} - DB hash: {} vs chain hash: {}",
                        campaign.getId(), dbHash, onChainHash);
                dataAuditService.recordTampering(campaign, "dataHash", dbHash, onChainHash);
                return new CompleteVerificationResult(false, "TAMPERED");
            }

            log.debug("Verification passed for campaign {}", campaign.getId());
            return new CompleteVerificationResult(true, "VERIFIED");

        } catch (Exception e) {
            log.error("Failed to verify campaign: {}", e.getMessage(), e);
            return new CompleteVerificationResult(false, "VERIFICATION_FAILED");
        }
    }

    /**
     * Quick integrity check (boolean result).
     */
    public boolean verifyCampaignIntegrity(Campaign campaign) {
        CompleteVerificationResult result = verifyComplete(campaign);
        return result.isVerified();
    }

    public String getVerificationBadge(Campaign campaign) {
        return verifyCampaignIntegrity(campaign) ? "VERIFIED" : "TAMPERED";
    }
}
