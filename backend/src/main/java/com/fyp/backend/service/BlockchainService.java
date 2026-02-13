package com.fyp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fyp.backend.dto.BlockchainCertificateResponse;
import com.fyp.backend.model.Campaign;
import com.fyp.backend.repository.CampaignRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BlockchainService {

    private final FabricGatewayService fabricGatewayService;
    private final CampaignRepository campaignRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Verify campaign data between blockchain and database.
     * Accepts a database campaign ID, resolves the blockchain campaign ID from the stored mapping.
     */
    public BlockchainCertificateResponse verifyCampaign(String campaignId) {
        try {
            // Look up campaign in database first to get its blockchain campaign ID
            Optional<Campaign> dbCampaign = campaignRepository.findById(Long.parseLong(campaignId));
            
            // Resolve the actual blockchain campaign ID
            String bcCampaignId;
            if (dbCampaign.isPresent()) {
                bcCampaignId = CampaignService.resolveBlockchainCampaignId(dbCampaign.get());
                if (bcCampaignId == null) {
                    return BlockchainCertificateResponse.builder()
                            .campaignId(campaignId)
                            .verified(false)
                            .verificationMessage("Campaign not recorded on blockchain")
                            .build();
                }
            } else {
                // Fallback: try using the DB ID directly (for old campaigns)
                bcCampaignId = campaignId;
            }
            
            // Query blockchain data using the blockchain-specific campaign ID
            String blockchainData = fabricGatewayService.readCampaign(bcCampaignId);

            if (blockchainData == null || blockchainData.isEmpty()) {
                return BlockchainCertificateResponse.builder()
                        .campaignId(campaignId)
                        .verified(false)
                        .verificationMessage("Campaign not found on blockchain")
                        .build();
            }

            // Parse blockchain data
            JsonNode campaignNode = objectMapper.readTree(blockchainData);

            BlockchainCertificateResponse.BlockchainCertificateResponseBuilder builder = BlockchainCertificateResponse
                    .builder()
                    // Immutable fields
                    .campaignId(campaignNode.get("campaignId").asText())
                    .title(campaignNode.has("title") ? campaignNode.get("title").asText() : "N/A")
                    .category(campaignNode.has("category") ? campaignNode.get("category").asText() : "N/A")
                    .description(campaignNode.get("description").asText())
                    .initiator(campaignNode.get("initiator").asText())
                    .createdAt(campaignNode.get("createdAt").asText())
                    .goalAmount(campaignNode.has("goalAmount") ? campaignNode.get("goalAmount").asDouble() : null)
                    .auditor(campaignNode.get("auditor").asText())
                    .dataHash(campaignNode.has("dataHash") ? campaignNode.get("dataHash").asText() : null)
                    // Dynamic fields
                    .status(campaignNode.get("status").asText())
                    .totalAmount(campaignNode.has("totalAmount") ? campaignNode.get("totalAmount").asDouble() : 0.0)
                    .donationCount(campaignNode.has("donationCount") ? campaignNode.get("donationCount").asInt() : 0);

            if (dbCampaign.isPresent()) {
                Campaign campaign = dbCampaign.get();
                builder.databaseId(campaign.getId())
                        .databaseStatus(campaign.getStatus())
                        .databaseCreatedAt(campaign.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .blockchainTxId(campaign.getBlockchainTxId())
                        .title(campaign.getTitle())
                        .verified(true)
                        .verificationMessage("Campaign verified successfully");
            } else {
                builder.verified(false)
                        .verificationMessage("Campaign found on blockchain but not in database");
            }

            return builder.build();

        } catch (Exception e) {
            log.error("Error verifying campaign: {}", e.getMessage(), e);
            return BlockchainCertificateResponse.builder()
                    .campaignId(campaignId)
                    .verified(false)
                    .verificationMessage("Error: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Search campaign by blockchain transaction ID
     * Queries directly from blockchain (not from database)
     * This is a blockchain search function - it only reads from blockchain
     * 通过区块链证书ID搜索项目 - 直接从区块链查询（不查询数据库）
     * 这是区块链检索功能，只读取区块链数据
     */
    public BlockchainCertificateResponse searchByTxId(String txId) {
        try {
            log.info("Searching blockchain for campaign with TxId: {}", txId);

            // Decode campaign ID from blockchain certificate ID
            String campaignId = decodeCampaignIdFromTxId(txId);
            log.info("Decoded campaign ID from TxId: {}", campaignId);

            // Query blockchain data directly (this is a blockchain search, not database
            // search)
            String blockchainData = fabricGatewayService.readCampaign(campaignId);

            if (blockchainData == null || blockchainData.isEmpty()) {
                log.warn("Campaign {} not found on blockchain", campaignId);
                return BlockchainCertificateResponse.builder()
                        .blockchainTxId(txId)
                        .campaignId(campaignId)
                        .verified(false)
                        .verificationMessage(
                                "Campaign not found on blockchain. Please ensure Fabric is running and the campaign exists.")
                        .build();
            }

            // Parse blockchain data
            JsonNode campaignNode = objectMapper.readTree(blockchainData);

            log.info("Campaign found on blockchain");

            // Check if campaign also exists in database (for comparison/verification)
            Optional<Campaign> dbCampaignOpt = campaignRepository.findAll().stream()
                    .filter(c -> txId.equals(c.getBlockchainTxId()))
                    .findFirst();

            BlockchainCertificateResponse.BlockchainCertificateResponseBuilder builder = BlockchainCertificateResponse
                    .builder()
                    // Immutable fields
                    .campaignId(campaignNode.get("campaignId").asText())
                    .title(campaignNode.has("title") ? campaignNode.get("title").asText() : "N/A")
                    .category(campaignNode.has("category") ? campaignNode.get("category").asText() : "N/A")
                    .description(campaignNode.get("description").asText())
                    .initiator(campaignNode.get("initiator").asText())
                    .createdAt(campaignNode.get("createdAt").asText())
                    .goalAmount(campaignNode.has("goalAmount") ? campaignNode.get("goalAmount").asDouble() : null)
                    .auditor(campaignNode.get("auditor").asText())
                    .dataHash(campaignNode.has("dataHash") ? campaignNode.get("dataHash").asText() : null)
                    .blockchainTxId(txId)
                    // Dynamic fields
                    .status(campaignNode.get("status").asText())
                    .totalAmount(campaignNode.has("totalAmount") ? campaignNode.get("totalAmount").asDouble() : 0.0)
                    .donationCount(campaignNode.has("donationCount") ? campaignNode.get("donationCount").asInt() : 0);

            // If also exists in database, add database info for comparison
            if (dbCampaignOpt.isPresent()) {
                Campaign dbCampaign = dbCampaignOpt.get();
                builder.databaseId(dbCampaign.getId())
                        .databaseStatus(dbCampaign.getStatus())
                        .databaseCreatedAt(dbCampaign.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .title(dbCampaign.getTitle())
                        .verified(true)
                        .verificationMessage("Campaign found on blockchain");
            } else {
                // Only on blockchain, not in database
                builder.verified(true)
                        .verificationMessage("Campaign found on blockchain");
            }

            return builder.build();

        } catch (Exception e) {
            log.error("Error searching blockchain by TxID: {}", e.getMessage(), e);
            return BlockchainCertificateResponse.builder()
                    .blockchainTxId(txId)
                    .verified(false)
                    .verificationMessage("Error querying blockchain: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Search donation record on blockchain by donation ID (e.g., DON_34_1770971306715)
     */
    public java.util.Map<String, Object> searchDonation(String donationId) {
        try {
            String blockchainData = fabricGatewayService.readDonation(donationId);

            if (blockchainData == null || blockchainData.isEmpty()) {
                return java.util.Map.of(
                    "found", false,
                    "donationId", donationId,
                    "message", "Donation not found on blockchain"
                );
            }

            JsonNode donationNode = objectMapper.readTree(blockchainData);

            java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
            result.put("found", true);
            result.put("donationId", donationNode.has("donationId") ? donationNode.get("donationId").asText() : donationId);
            result.put("campaignId", donationNode.has("campaignId") ? donationNode.get("campaignId").asText() : null);
            result.put("amount", donationNode.has("amount") ? donationNode.get("amount").asDouble() : null);
            result.put("donor", donationNode.has("donor") ? donationNode.get("donor").asText() : null);
            result.put("displayName", donationNode.has("displayName") ? donationNode.get("displayName").asText() : null);
            result.put("isAnonymous", donationNode.has("isAnonymous") ? donationNode.get("isAnonymous").asBoolean() : null);
            result.put("donatedAt", donationNode.has("donatedAt") ? donationNode.get("donatedAt").asText() : null);
            result.put("message", "Donation found on blockchain");
            return result;

        } catch (Exception e) {
            log.error("Error searching donation on blockchain: {}", e.getMessage(), e);
            return java.util.Map.of(
                "found", false,
                "donationId", donationId,
                "message", "Error querying blockchain: " + e.getMessage()
            );
        }
    }

    /**
     * Decode blockchain certificate ID to extract the blockchain campaign ID.
     * Supports two formats:
     *   New: BC_hex(blockchainCampaignId::timestamp) - separator is "::"
     *   Old: BC_hex(dbId_timestamp) - separator is "_"
     */
    private String decodeCampaignIdFromTxId(String txId) {
        try {
            // Remove BC_ prefix
            if (!txId.startsWith("BC_")) {
                throw new IllegalArgumentException("Invalid blockchain certificate ID format");
            }
            String hexString = txId.substring(3);

            // Convert hex to bytes
            byte[] bytes = new byte[hexString.length() / 2];
            for (int i = 0; i < bytes.length; i++) {
                bytes[i] = (byte) Integer.parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
            }

            // Convert bytes to string
            String decoded = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);

            // New format uses "::" as separator between campaign ID and timestamp
            if (decoded.contains("::")) {
                String[] parts = decoded.split("::", 2);
                return parts[0]; // e.g., "C_7_1770969349959"
            }

            // Old format uses "_" as separator (campaign ID was a simple number)
            String[] parts = decoded.split("_", 2);
            if (parts.length < 1) {
                throw new IllegalArgumentException("Failed to extract campaign ID from decoded string");
            }
            return parts[0]; // e.g., "7"
        } catch (Exception e) {
            log.error("Failed to decode campaign ID from txId: {}", e.getMessage());
            throw new RuntimeException("Failed to decode blockchain certificate ID: " + e.getMessage(), e);
        }
    }

}
