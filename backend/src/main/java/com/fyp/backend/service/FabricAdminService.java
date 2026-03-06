package com.fyp.backend.service;

import com.fyp.backend.config.FabricConfig;
import com.fyp.backend.model.DataAuditLog;
import com.fyp.backend.repository.CampaignAuditRepository;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.DataAuditLogRepository;
import com.fyp.backend.repository.DonationRepository;
import lombok.extern.slf4j.Slf4j;
import org.hyperledger.fabric.protos.common.BlockchainInfo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
public class FabricAdminService {

    @Autowired
    private FabricGatewayService fabricGatewayService;

    @Autowired
    private FabricConfig fabricConfig;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private DonationRepository donationRepository;

    @Autowired
    private DataAuditLogRepository auditLogRepository;

    @Autowired
    private CampaignAuditRepository campaignAuditRepository;

    public Map<String, Object> getNetworkStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("channel", fabricConfig.getChannelName());
        stats.put("chaincode", fabricConfig.getChaincodeName());
        stats.put("peerEndpoint", fabricConfig.getPeerEndpoint());
        stats.put("mspId", fabricConfig.getMspId());
        stats.put("fabricEnabled", fabricGatewayService.isEnabled());
        stats.put("queriedAt", LocalDateTime.now().toString());

        long blockHeight = -1;
        String currentBlockHash = "";
        String previousBlockHash = "";

        if (fabricGatewayService.isEnabled()) {
            try {
                // Use QSCC to get channel info
                var network = getNetwork();
                if (network != null) {
                    var qscc = network.getContract("qscc");
                    byte[] result = qscc.evaluateTransaction("GetChainInfo", fabricConfig.getChannelName());
                    BlockchainInfo info = BlockchainInfo.parseFrom(result);
                    blockHeight = info.getHeight();
                    currentBlockHash = bytesToHex(info.getCurrentBlockHash().toByteArray());
                    previousBlockHash = bytesToHex(info.getPreviousBlockHash().toByteArray());
                }
            } catch (Exception e) {
                log.warn("Failed to query QSCC for block height: {}", e.getMessage());
            }
        }

        stats.put("blockHeight", blockHeight);
        stats.put("currentBlockHash", currentBlockHash);
        stats.put("previousBlockHash", previousBlockHash);

        // DB-based counts
        stats.put("totalCampaignsOnChain", campaignRepository.countByBlockchainTxIdIsNotNull());
        stats.put("totalDonationsOnChain", donationRepository.countByTransactionHashIsNotNull());

        return stats;
    }

    public List<Map<String, Object>> getNodeStatus() {
        List<Map<String, Object>> nodes = new ArrayList<>();

        Map<String, Object> peer1 = new LinkedHashMap<>();
        peer1.put("name", "peer0.org1.example.com");
        peer1.put("msp", "Org1MSP");
        peer1.put("endpoint", fabricConfig.getPeerEndpoint());
        peer1.put("role", "Endorsing Peer");
        peer1.put("connected", fabricGatewayService.isEnabled());
        nodes.add(peer1);

        Map<String, Object> peer2 = new LinkedHashMap<>();
        peer2.put("name", "peer0.org2.example.com");
        peer2.put("msp", "Org2MSP");
        peer2.put("endpoint", "peer0.org2.example.com:9051");
        peer2.put("role", "Endorsing Peer");
        peer2.put("connected", fabricGatewayService.isEnabled());
        nodes.add(peer2);

        Map<String, Object> orderer = new LinkedHashMap<>();
        orderer.put("name", "orderer.example.com");
        orderer.put("msp", "OrdererMSP");
        orderer.put("endpoint", "orderer.example.com:7050");
        orderer.put("role", "Orderer");
        orderer.put("connected", fabricGatewayService.isEnabled());
        nodes.add(orderer);

        return nodes;
    }

    public List<Map<String, Object>> getTransactions(int page, int size) {
        List<Map<String, Object>> txList = new ArrayList<>();

        var campaigns = campaignRepository.findAll(
            PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        for (var c : campaigns) {
            if (c.getBlockchainTxId() == null) continue;
            Map<String, Object> tx = new LinkedHashMap<>();
            tx.put("txId", c.getBlockchainTxId());
            tx.put("type", "CREATE_CAMPAIGN");
            tx.put("entityId", "C_" + c.getId());
            tx.put("summary", "Campaign: " + c.getTitle());
            tx.put("amount", null);
            tx.put("timestamp", c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
            tx.put("chaincode", fabricConfig.getChaincodeName());
            tx.put("channel", fabricConfig.getChannelName());
            txList.add(tx);
        }

        var donations = donationRepository.findAll(
            PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "donationDate"))
        );
        for (var d : donations) {
            if (d.getTransactionHash() == null) continue;
            Map<String, Object> tx = new LinkedHashMap<>();
            tx.put("txId", d.getTransactionHash());
            tx.put("type", "CREATE_DONATION");
            tx.put("entityId", "D_" + d.getId());
            tx.put("summary", "Donation by " + (d.getDisplayName() != null ? d.getDisplayName() : "Anonymous"));
            tx.put("amount", d.getAmount());
            tx.put("timestamp", d.getDonationDate() != null ? d.getDonationDate().toString() : "");
            tx.put("chaincode", fabricConfig.getChaincodeName());
            tx.put("channel", fabricConfig.getChannelName());
            txList.add(tx);
        }

        // Include on-chain audit records
        var audits = campaignAuditRepository.findAll(
            PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        for (var a : audits) {
            if (a.getBlockchainAuditId() == null) continue;
            Map<String, Object> tx = new LinkedHashMap<>();
            tx.put("txId", a.getBlockchainAuditId());
            tx.put("type", "AUDIT_REVIEW");
            tx.put("entityId", "A_" + a.getId());
            tx.put("summary", "Audit [" + a.getConclusion() + "] by " +
                    (a.getAuditor() != null ? a.getAuditor().getDisplayName() : "—") +
                    " for " + (a.getCampaign() != null ? a.getCampaign().getTitle() : "—"));
            tx.put("amount", null);
            tx.put("timestamp", a.getCreatedAt() != null ? a.getCreatedAt().toString() : "");
            tx.put("chaincode", fabricConfig.getChaincodeName());
            tx.put("channel", fabricConfig.getChannelName());
            txList.add(tx);
        }

        txList.sort((a, b) -> {
            String tA = (String) a.getOrDefault("timestamp", "");
            String tB = (String) b.getOrDefault("timestamp", "");
            return tB.compareTo(tA);
        });

        int fromIdx = page * size;
        int toIdx = Math.min(fromIdx + size, txList.size());
        return fromIdx >= txList.size() ? List.of() : txList.subList(fromIdx, toIdx);
    }

    public List<Map<String, Object>> getAuditLogs(int page, int size) {
        var logs = auditLogRepository.findAll(
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "modifiedAt"))
        );
        List<Map<String, Object>> result = new ArrayList<>();
        for (DataAuditLog log : logs) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", log.getId());
            entry.put("entityType", log.getEntityType());
            entry.put("entityId", log.getEntityId());
            entry.put("fieldName", log.getFieldName());
            entry.put("oldValue", log.getOldValue());
            entry.put("newValue", log.getNewValue());
            entry.put("modifiedAt", log.getModifiedAt() != null ? log.getModifiedAt().toString() : "");
            entry.put("modifiedBy", log.getModifiedBy());
            entry.put("modifiedSource", log.getModifiedSource());
            entry.put("verificationStatus", log.getVerificationStatus());
            entry.put("notes", log.getNotes());
            result.add(entry);
        }
        return result;
    }

    public Map<String, Object> getBlockByNumber(long blockNum) {
        Map<String, Object> blockInfo = new LinkedHashMap<>();
        blockInfo.put("blockNumber", blockNum);

        if (!fabricGatewayService.isEnabled()) {
            blockInfo.put("error", "Fabric not connected");
            return blockInfo;
        }

        try {
            var network = getNetwork();
            if (network == null) {
                blockInfo.put("error", "Network unavailable");
                return blockInfo;
            }
            var qscc = network.getContract("qscc");
            byte[] result = qscc.evaluateTransaction("GetBlockByNumber",
                    fabricConfig.getChannelName(), String.valueOf(blockNum));

            // Parse the raw block - extract basic info without full proto deserialization
            blockInfo.put("rawSizeBytes", result.length);
            blockInfo.put("channel", fabricConfig.getChannelName());
            blockInfo.put("retrieved", true);
            blockInfo.put("dataHash", bytesToHex(Arrays.copyOfRange(result, 0, Math.min(32, result.length))));
        } catch (Exception e) {
            log.warn("Failed to get block {}: {}", blockNum, e.getMessage());
            blockInfo.put("error", e.getMessage());
        }

        return blockInfo;
    }

    private org.hyperledger.fabric.client.Network getNetwork() {
        return fabricGatewayService.getNetwork();
    }

    private static String bytesToHex(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return "";
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
