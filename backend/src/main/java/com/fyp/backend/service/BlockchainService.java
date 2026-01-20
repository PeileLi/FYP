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
     * Verify campaign data between blockchain and database
     */
    public BlockchainCertificateResponse verifyCampaign(String campaignId) {
        try {
            // Query blockchain data
            String blockchainData = fabricGatewayService.readCampaign(campaignId);
            
            if (blockchainData == null || blockchainData.isEmpty()) {
                return BlockchainCertificateResponse.builder()
                        .campaignId(campaignId)
                        .verified(false)
                        .verificationMessage("Campaign not found on blockchain")
                        .build();
            }

            // Parse blockchain data
            JsonNode campaignNode = objectMapper.readTree(blockchainData);
            
            // Query database data
            Optional<Campaign> dbCampaign = campaignRepository.findById(Long.parseLong(campaignId));
            
            BlockchainCertificateResponse.BlockchainCertificateResponseBuilder builder = 
                BlockchainCertificateResponse.builder()
                    .campaignId(campaignNode.get("campaignId").asText())
                    .initiator(campaignNode.get("initiator").asText())
                    .createdAt(campaignNode.get("createdAt").asText())
                    .status(campaignNode.get("status").asText())
                    .description(campaignNode.get("description").asText())
                    .auditor(campaignNode.get("auditor").asText());

            if (dbCampaign.isPresent()) {
                Campaign campaign = dbCampaign.get();
                builder.databaseId(campaign.getId())
                       .databaseStatus(campaign.getStatus())
                       .databaseCreatedAt(campaign.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                       .blockchainTxId(campaign.getBlockchainTxId())
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
     */
    public BlockchainCertificateResponse searchByTxId(String txId) {
        try {
            // Find campaign in database by transaction ID
            Optional<Campaign> campaignOpt = campaignRepository.findAll().stream()
                    .filter(c -> txId.equals(c.getBlockchainTxId()))
                    .findFirst();

            if (!campaignOpt.isPresent()) {
                return BlockchainCertificateResponse.builder()
                        .blockchainTxId(txId)
                        .verified(false)
                        .verificationMessage("No campaign found with this transaction ID")
                        .build();
            }

            Campaign campaign = campaignOpt.get();
            String campaignId = String.valueOf(campaign.getId());

            // Get blockchain data
            return verifyCampaign(campaignId);

        } catch (Exception e) {
            log.error("Error searching by TxID: {}", e.getMessage(), e);
            return BlockchainCertificateResponse.builder()
                    .blockchainTxId(txId)
                    .verified(false)
                    .verificationMessage("Error: " + e.getMessage())
                    .build();
        }
    }
}
