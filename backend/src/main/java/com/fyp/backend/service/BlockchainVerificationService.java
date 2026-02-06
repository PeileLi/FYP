package com.fyp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fyp.backend.model.Campaign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Service for verifying data integrity between database and blockchain
 * 用于验证数据库和区块链之间数据完整性的服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BlockchainVerificationService {
    
    private final FabricGatewayService fabricGatewayService;
    private final com.fyp.backend.repository.DonationRepository donationRepository;
    private final DataAuditService dataAuditService;
    
    /**
     * Complete verification result with blockchain data
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class CompleteVerificationResult {
        private boolean verified;
        private String status;  // "VERIFIED", "TAMPERED", "NOT_RECORDED", "VERIFICATION_FAILED"
        private BigDecimal blockchainAmount;
        private Integer blockchainDonationCount;
    }
    
    /**
     * Verify campaign and return complete result with blockchain data
     * 验证活动并返回包含区块链数据的完整结果
     * 
     * @param campaign Campaign from database
     * @return CompleteVerificationResult with blockchain amount and count
     */
    public CompleteVerificationResult verifyComplete(Campaign campaign) {
        if (!fabricGatewayService.isEnabled()) {
            return new CompleteVerificationResult(true, "NOT_RECORDED", null, null);
        }
        
        if (campaign.getBlockchainTxId() == null) {
            return new CompleteVerificationResult(true, "NOT_RECORDED", null, null);
        }
        
        try {
            String campaignId = String.valueOf(campaign.getId());
            String blockchainData = fabricGatewayService.readCampaign(campaignId);
            
            if (blockchainData == null || blockchainData.isEmpty()) {
                log.error("No blockchain data found for campaign {}", campaignId);
                return new CompleteVerificationResult(false, "VERIFICATION_FAILED", null, null);
            }
            
            // Parse blockchain JSON
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(blockchainData);
            
            // Extract blockchain data
            BigDecimal blockchainAmount = new BigDecimal(root.get("totalAmount").asDouble());
            int blockchainCount = root.get("donationCount").asInt();
            
            // Verify hash (immutable fields)
            boolean hashValid = verifyDataMatch(campaign, blockchainData);
            
            // Verify amount matches
            BigDecimal dbAmount = campaign.getCurrentAmount();
            boolean amountMatches = dbAmount.compareTo(blockchainAmount) == 0;
            
            if (!hashValid || !amountMatches) {
                log.error("⚠️ TAMPERING DETECTED for campaign {}", campaignId);
                if (!hashValid) {
                    log.error("  Hash mismatch - immutable fields tampered");
                    // Record hash tampering in audit log
                    dataAuditService.recordTampering(
                        campaign, 
                        "dataHash", 
                        "Hash mismatch detected",
                        "Blockchain hash is valid"
                    );
                }
                if (!amountMatches) {
                    log.error("  Amount mismatch - DB: {}, Blockchain: {}", dbAmount, blockchainAmount);
                    // Record amount tampering in audit log
                    dataAuditService.recordTampering(
                        campaign, 
                        "currentAmount",
                        blockchainAmount.toString(),  // Blockchain value (truth)
                        dbAmount.toString()           // Database value (tampered)
                    );
                }
                return new CompleteVerificationResult(false, "TAMPERED", blockchainAmount, blockchainCount);
            }
            
            return new CompleteVerificationResult(true, "VERIFIED", blockchainAmount, blockchainCount);
            
        } catch (Exception e) {
            log.error("Failed to verify campaign: {}", e.getMessage(), e);
            return new CompleteVerificationResult(false, "VERIFICATION_FAILED", null, null);
        }
    }
    
    /**
     * Verify campaign data integrity
     * Compare database data with blockchain data
     * 
     * @param campaign Campaign from database
     * @return true if data matches, false if tampered
     */
    public boolean verifyCampaignIntegrity(Campaign campaign) {
        if (!fabricGatewayService.isEnabled()) {
            log.warn("Blockchain disabled, skipping verification");
            return true; // Skip verification if blockchain is disabled
        }
        
        if (campaign.getBlockchainTxId() == null) {
            log.warn("Campaign {} has no blockchain record", campaign.getId());
            return true; // No blockchain record to verify against
        }
        
        try {
            String campaignId = String.valueOf(campaign.getId());
            
            // Query campaign data from blockchain
            String blockchainData = fabricGatewayService.readCampaign(campaignId);
            
            if (blockchainData == null || blockchainData.isEmpty()) {
                log.error("No blockchain data found for campaign {}", campaignId);
                return false;
            }
            
            // Parse blockchain data and compare
            // This is a simplified example - you need to parse the actual JSON response
            boolean isValid = verifyDataMatch(campaign, blockchainData);
            
            if (!isValid) {
                log.error("⚠️ DATA TAMPERING DETECTED for campaign {}", campaignId);
                log.error("Database data does not match blockchain record");
            }
            
            return isValid;
            
        } catch (Exception e) {
            log.error("Failed to verify campaign integrity: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Verify campaign amount matches blockchain record
     */
    public VerificationResult verifyCampaignAmount(Long campaignId, BigDecimal dbAmount) {
        if (!fabricGatewayService.isEnabled()) {
            return new VerificationResult(true, "Blockchain disabled", null);
        }
        
        try {
            String blockchainData = fabricGatewayService.readCampaign(String.valueOf(campaignId));
            
            if (blockchainData == null) {
                return new VerificationResult(false, "No blockchain record", null);
            }
            
            // Parse blockchain amount
            BigDecimal blockchainAmount = parseAmountFromBlockchain(blockchainData);
            
            if (blockchainAmount == null) {
                return new VerificationResult(false, "Cannot parse blockchain data", null);
            }
            
            // Compare amounts
            boolean matches = dbAmount.compareTo(blockchainAmount) == 0;
            
            if (!matches) {
                return new VerificationResult(
                    false, 
                    "Amount mismatch",
                    new AmountMismatch(dbAmount, blockchainAmount)
                );
            }
            
            return new VerificationResult(true, "Verified", null);
            
        } catch (Exception e) {
            return new VerificationResult(false, "Verification failed: " + e.getMessage(), null);
        }
    }
    
    /**
     * Get verification status for display
     */
    public String getVerificationBadge(Campaign campaign) {
        if (verifyCampaignIntegrity(campaign)) {
            return "VERIFIED";
        } else {
            return "TAMPERED";
        }
    }
    
    // Helper methods
    
    private boolean verifyDataMatch(Campaign campaign, String blockchainData) {
        try {
            // Parse blockchain JSON response
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(blockchainData);
            
            // Check if blockchain has new hash field (updated chaincode)
            JsonNode dataHashNode = root.get("dataHash");
            
            if (dataHashNode != null && !dataHashNode.isNull()) {
                // NEW CHAINCODE: Use hash-based verification
                String blockchainHash = dataHashNode.asText();
                String blockchainTitle = root.get("title").asText();
                String blockchainDescription = root.get("description").asText();
                String blockchainCategory = root.get("category").asText();
                String blockchainInitiator = root.get("initiator").asText();
                String blockchainCreatedAt = root.get("createdAt").asText();
                double blockchainGoalAmount = root.get("goalAmount").asDouble();
                String blockchainAuditor = root.get("auditor").asText();
                
                // Calculate hash from database values (ONLY immutable fields)
                String dbHash = calculateCampaignHash(
                    String.valueOf(campaign.getId()),
                    campaign.getTitle(),
                    campaign.getDescription(),
                    campaign.getCategory(),
                    campaign.getOrganizer().getEmail(),
                    blockchainCreatedAt,  // Use blockchain's timestamp format
                    campaign.getGoalAmount(),
                    blockchainAuditor  // Use blockchain's auditor value
                );
                
                // Compare hashes
                boolean hashMatches = dbHash.equals(blockchainHash);
                
                if (!hashMatches) {
                    log.error("⚠️ IMMUTABLE DATA TAMPERING DETECTED!");
                    log.error("  DB Hash:          {}", dbHash);
                    log.error("  Blockchain Hash:  {}", blockchainHash);
                    log.error("  Campaign ID:      {}", campaign.getId());
                    log.error("  Title (DB):       {}", campaign.getTitle());
                    log.error("  Title (BC):       {}", blockchainTitle);
                    log.error("  Description (DB): {}", campaign.getDescription());
                    log.error("  Description (BC): {}", blockchainDescription);
                    log.error("  Category (DB):    {}", campaign.getCategory());
                    log.error("  Category (BC):    {}", blockchainCategory);
                    log.error("  Goal Amount (DB): {}", campaign.getGoalAmount());
                    log.error("  Goal Amount (BC): {}", blockchainGoalAmount);
                    return false;
                }
                
                log.info("✅ Hash verification passed for campaign {}", campaign.getId());
                return true;
                
            } else {
                // OLD CHAINCODE: Fallback to simple amount comparison
                log.warn("⚠️ Old chaincode detected (no dataHash), using simple amount comparison for campaign {}", campaign.getId());
                
                // Check if totalAmount field exists
                JsonNode totalAmountNode = root.get("totalAmount");
                if (totalAmountNode == null || totalAmountNode.isNull()) {
                    log.error("Blockchain data missing totalAmount field");
                    return false;
                }
                
                double blockchainAmount = totalAmountNode.asDouble();
                BigDecimal dbAmount = campaign.getCurrentAmount();
                BigDecimal blockchainAmountBD = new BigDecimal(blockchainAmount);
                
                boolean amountMatches = dbAmount.compareTo(blockchainAmountBD) == 0;
                
                if (!amountMatches) {
                    log.error("⚠️ AMOUNT MISMATCH - DB: {}, Blockchain: {}", dbAmount, blockchainAmount);
                    return false;
                }
                
                log.info("✅ Simple amount verification passed for campaign {} (old chaincode)", campaign.getId());
                return true;
            }
            
        } catch (Exception e) {
            log.error("Failed to verify data: {}", e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Calculate SHA-256 hash of IMMUTABLE campaign fields only
     * Must match the hash calculation in chaincode.go
     * Hash format: CampaignID|Title|Description|Category|Initiator|CreatedAt|GoalAmount|Auditor
     * 
     * Note: Dynamic fields (TotalAmount, DonationCount, Status) are NOT included
     * because they change during normal operations.
     */
    private String calculateCampaignHash(String campaignId, String title, String description, String category,
                                        String initiator, String createdAt, BigDecimal goalAmount, String auditor) {
        try {
            // Format goal amount with 2 decimal places (same as Go's 'f', 2, 64)
            String formattedGoalAmount = String.format("%.2f", goalAmount.doubleValue());
            
            // Concatenate ONLY immutable fields in same order as Go code
            String data = campaignId + "|" + 
                         title + "|" + 
                         description + "|" + 
                         category + "|" + 
                         initiator + "|" + 
                         createdAt + "|" + 
                         formattedGoalAmount + "|" + 
                         auditor;
            
            // Calculate SHA-256 hash
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            
            // Convert to hex string
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            
            return hexString.toString();
            
        } catch (Exception e) {
            log.error("Failed to calculate hash: {}", e.getMessage());
            return null;
        }
    }
    
    private BigDecimal parseAmountFromBlockchain(String blockchainData) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(blockchainData);
            double amount = root.get("totalAmount").asDouble();
            return new BigDecimal(amount);
        } catch (Exception e) {
            log.error("Failed to parse amount from blockchain: {}", e.getMessage());
            return null;
        }
    }
    
    // Result classes
    
    public static class VerificationResult {
        private final boolean valid;
        private final String message;
        private final AmountMismatch mismatch;
        
        public VerificationResult(boolean valid, String message, AmountMismatch mismatch) {
            this.valid = valid;
            this.message = message;
            this.mismatch = mismatch;
        }
        
        public boolean isValid() { return valid; }
        public String getMessage() { return message; }
        public AmountMismatch getMismatch() { return mismatch; }
    }
    
    public static class AmountMismatch {
        private final BigDecimal databaseAmount;
        private final BigDecimal blockchainAmount;
        
        public AmountMismatch(BigDecimal databaseAmount, BigDecimal blockchainAmount) {
            this.databaseAmount = databaseAmount;
            this.blockchainAmount = blockchainAmount;
        }
        
        public BigDecimal getDatabaseAmount() { return databaseAmount; }
        public BigDecimal getBlockchainAmount() { return blockchainAmount; }
    }
}
