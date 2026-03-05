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

    public BlockchainCertificateResponse verifyCampaign(String campaignId) {
        try {
            Optional<Campaign> dbCampaign = campaignRepository.findById(Long.parseLong(campaignId));

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
                return BlockchainCertificateResponse.builder()
                        .campaignId(campaignId)
                        .verified(false)
                        .verificationMessage("Campaign not found in database")
                        .build();
            }

            String blockchainData = fabricGatewayService.readCampaign(bcCampaignId);

            if (blockchainData == null || blockchainData.isEmpty()) {
                return BlockchainCertificateResponse.builder()
                        .campaignId(campaignId)
                        .verified(false)
                        .verificationMessage("Campaign not found on blockchain")
                        .build();
            }

            JsonNode node = objectMapper.readTree(blockchainData);
            BlockchainCertificateResponse.BlockchainCertificateResponseBuilder builder =
                    buildFromChainNode(node);

            Campaign campaign = dbCampaign.get();
            String computedHash = CampaignService.computeCampaignDataHash(campaign);
            String onChainHash = safeText(node, "dataHash", "");
            boolean hashMatch = !onChainHash.isEmpty() && onChainHash.equals(computedHash);

            builder.databaseId(campaign.getId())
                    .databaseStatus(campaign.getStatus())
                    .databaseCreatedAt(campaign.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .blockchainTxId(campaign.getBlockchainTxId())
                    .computedDataHash(computedHash)
                    .verified(hashMatch)
                    .verificationMessage(hashMatch
                            ? "Campaign verified — data hash matches on-chain record"
                            : "Hash mismatch — off-chain data may have been modified");

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

    public BlockchainCertificateResponse searchByTxId(String txId) {
        try {
            log.info("Searching blockchain for campaign with TxId: {}", txId);

            String campaignId = decodeCampaignIdFromTxId(txId);
            log.info("Decoded campaign ID from TxId: {}", campaignId);

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

            JsonNode node = objectMapper.readTree(blockchainData);
            log.info("Campaign found on blockchain");

            Optional<Campaign> dbCampaignOpt = campaignRepository.findAll().stream()
                    .filter(c -> txId.equals(c.getBlockchainTxId()))
                    .findFirst();

            BlockchainCertificateResponse.BlockchainCertificateResponseBuilder builder =
                    buildFromChainNode(node).blockchainTxId(txId);

            if (dbCampaignOpt.isPresent()) {
                Campaign dbCampaign = dbCampaignOpt.get();
                String computedHash = CampaignService.computeCampaignDataHash(dbCampaign);
                String onChainHash = safeText(node, "dataHash", "");
                boolean hashMatch = !onChainHash.isEmpty() && onChainHash.equals(computedHash);

                builder.databaseId(dbCampaign.getId())
                        .databaseStatus(dbCampaign.getStatus())
                        .databaseCreatedAt(dbCampaign.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .computedDataHash(computedHash)
                        .verified(hashMatch)
                        .verificationMessage(hashMatch
                                ? "Campaign verified — data hash matches on-chain record"
                                : "Hash mismatch — off-chain data may have been modified");
            } else {
                builder.verified(true)
                        .verificationMessage("Campaign found on blockchain (no database record for hash comparison)");
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

    public java.util.Map<String, Object> searchDonation(String donationId) {
        try {
            String rawDonationId = decodeDonationId(donationId);
            String blockchainData = fabricGatewayService.readDonation(rawDonationId);

            if (blockchainData == null || blockchainData.isEmpty()) {
                return java.util.Map.of(
                    "found", false,
                    "donationId", donationId,
                    "message", "Donation not found on blockchain"
                );
            }

            JsonNode n = objectMapper.readTree(blockchainData);

            java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
            result.put("found", true);
            result.put("donationId", safeText(n, "donationId", donationId));
            result.put("campaignId", safeText(n, "campaignId", null));
            result.put("amount", n.has("amount") ? n.get("amount").asDouble() : null);
            result.put("donorHash", safeText(n, "donorHash", null));
            result.put("donatedAt", safeText(n, "donatedAt", null));
            result.put("paymentRefHash", safeText(n, "paymentRefHash", null));
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

    private BlockchainCertificateResponse.BlockchainCertificateResponseBuilder buildFromChainNode(JsonNode node) {
        return BlockchainCertificateResponse.builder()
                .campaignId(safeText(node, "campaignId", ""))
                .initiator(safeText(node, "initiator", ""))
                .createdAt(safeText(node, "createdAt", ""))
                .lastUpdated(safeText(node, "lastUpdated", ""))
                .deadline(safeText(node, "deadline", ""))
                .goalAmount(node.has("goalAmount") ? node.get("goalAmount").asDouble() : null)
                .status(safeText(node, "status", ""))
                .auditor(safeText(node, "auditor", ""))
                .version(node.has("version") ? node.get("version").asInt() : null)
                .dataHash(safeText(node, "dataHash", ""));
    }

    private static String safeText(JsonNode node, String field, String fallback) {
        return node.has(field) ? node.get(field).asText(fallback) : fallback;
    }

    private String decodeCampaignIdFromTxId(String txId) {
        try {
            if (!txId.startsWith("BC")) {
                throw new IllegalArgumentException("Invalid blockchain certificate ID format");
            }
            String hexString = txId.substring(2);
            byte[] bytes = new byte[hexString.length() / 2];
            for (int i = 0; i < bytes.length; i++) {
                bytes[i] = (byte) Integer.parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
            }
            String decoded = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            return decoded.split("::", 2)[0];
        } catch (Exception e) {
            log.error("Failed to decode campaign ID from txId: {}", e.getMessage());
            throw new RuntimeException("Failed to decode blockchain certificate ID: " + e.getMessage(), e);
        }
    }

    private String decodeDonationId(String donationId) {
        if (!donationId.startsWith("BD")) {
            throw new IllegalArgumentException("Invalid donation certificate ID format");
        }
        try {
            String hexString = donationId.substring(2);
            byte[] bytes = new byte[hexString.length() / 2];
            for (int i = 0; i < bytes.length; i++) {
                bytes[i] = (byte) Integer.parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
            }
            String decoded = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            return decoded.split("::", 2)[0];
        } catch (Exception e) {
            log.error("Failed to decode donation ID: {}", e.getMessage());
            throw new RuntimeException("Failed to decode donation certificate ID: " + e.getMessage(), e);
        }
    }
}
