package com.fyp.backend.service;

import com.fyp.backend.model.Donation;
import com.fyp.backend.repository.DonationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DonationAdminService {

    private final DonationRepository donationRepository;
    private final FabricGatewayService fabricGatewayService;

    public List<Map<String, Object>> getDonations(Long campaignId, String status,
                                                   String from, String to) {
        LocalDateTime fromDt = from != null && !from.isBlank() ? LocalDateTime.parse(from + "T00:00:00") : null;
        LocalDateTime toDt   = to   != null && !to.isBlank()   ? LocalDateTime.parse(to   + "T23:59:59") : null;

        List<Donation> donations;
        if (campaignId == null && status == null && fromDt == null && toDt == null) {
            donations = donationRepository.findAllByOrderByDonationDateDesc();
        } else {
            donations = donationRepository.searchAdmin(campaignId, status, fromDt, toDt);
        }

        return donations.stream().map(this::toMap).toList();
    }

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        BigDecimal total = donationRepository.getTotalDonationAmount();
        long count = donationRepository.count();
        long donors = donationRepository.countDistinctDonors();
        long onChain = donationRepository.countByTransactionHashIsNotNull();

        stats.put("totalAmount", total);
        stats.put("totalCount", count);
        stats.put("uniqueDonors", donors);
        stats.put("onChainCount", onChain);
        stats.put("onChainRate", count > 0 ? (onChain * 100.0 / count) : 0.0);

        // Last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        BigDecimal last30 = donationRepository.sumAmountSince(thirtyDaysAgo);
        stats.put("last30DaysAmount", last30);

        // By category
        List<Object[]> byCategory = donationRepository.sumByCampaignCategory();
        List<Map<String, Object>> categoryStats = new ArrayList<>();
        for (Object[] row : byCategory) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("category", row[0]);
            entry.put("amount", row[1]);
            categoryStats.add(entry);
        }
        stats.put("byCategory", categoryStats);

        // Daily trend (last 30 days)
        List<Object[]> daily = donationRepository.dailyStatsSince(thirtyDaysAgo);
        List<Map<String, Object>> dailyStats = new ArrayList<>();
        for (Object[] row : daily) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", row[0] != null ? row[0].toString() : "");
            entry.put("count", row[1]);
            entry.put("amount", row[2]);
            dailyStats.add(entry);
        }
        stats.put("dailyTrend", dailyStats);

        return stats;
    }

    public Map<String, Object> verifyTransaction(Long donationId) {
        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new RuntimeException("Donation not found: " + donationId));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("donationId", donationId);
        result.put("amount", donation.getAmount());
        result.put("date", donation.getDonationDate() != null ? donation.getDonationDate().toString() : "");
        result.put("transactionHash", donation.getTransactionHash());

        if (donation.getTransactionHash() == null) {
            result.put("status", "NOT_ON_CHAIN");
            result.put("message", "This donation has no blockchain record");
            return result;
        }

        if (!fabricGatewayService.isEnabled()) {
            result.put("status", "FABRIC_UNAVAILABLE");
            result.put("message", "Blockchain network is not connected");
            return result;
        }

        try {
            String chainData = fabricGatewayService.readDonation(donation.getTransactionHash());
            if (chainData != null && !chainData.isBlank()) {
                result.put("status", "VERIFIED");
                result.put("message", "Transaction verified on blockchain");
                result.put("chainRecord", chainData);
            } else {
                result.put("status", "NOT_FOUND");
                result.put("message", "Transaction ID not found on blockchain");
            }
        } catch (Exception e) {
            result.put("status", "VERIFICATION_FAILED");
            result.put("message", "Verification error: " + e.getMessage());
        }

        return result;
    }

    public String exportCsv(Long campaignId, String status, String from, String to) {
        List<Map<String, Object>> donations = getDonations(campaignId, status, from, to);

        StringBuilder sb = new StringBuilder();
        sb.append("ID,Date,Donor,Amount,Campaign,Status,OnChain,TransactionHash\n");
        for (Map<String, Object> d : donations) {
            sb.append(csv(d.get("id"))).append(",");
            sb.append(csv(d.get("date"))).append(",");
            sb.append(csv(d.get("displayName"))).append(",");
            sb.append(csv(d.get("amount"))).append(",");
            sb.append(csv(d.get("campaignTitle"))).append(",");
            sb.append(csv(d.get("status"))).append(",");
            sb.append(csv(d.get("onChain"))).append(",");
            sb.append(csv(d.get("transactionHash")));
            sb.append("\n");
        }
        return sb.toString();
    }

    private Map<String, Object> toMap(Donation d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("displayName", d.getIsAnonymous() ? "Anonymous" : (d.getDisplayName() != null ? d.getDisplayName() : "—"));
        m.put("donorUsername", d.getUser() != null ? d.getUser().getUsername() : "—");
        m.put("amount", d.getAmount());
        m.put("message", d.getMessage());
        m.put("anonymous", d.getIsAnonymous());
        m.put("status", d.getStatus());
        m.put("date", d.getDonationDate() != null ? d.getDonationDate().toString() : "");
        m.put("campaignId", d.getCampaign() != null ? d.getCampaign().getId() : null);
        m.put("campaignTitle", d.getCampaign() != null ? d.getCampaign().getTitle() : "—");
        m.put("campaignStatus", d.getCampaign() != null ? d.getCampaign().getStatus() : "—");
        m.put("onChain", d.getTransactionHash() != null);
        m.put("transactionHash", d.getTransactionHash());
        return m;
    }

    private String csv(Object val) {
        if (val == null) return "";
        String s = val.toString().replace("\"", "\"\"");
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s + "\"";
        }
        return s;
    }
}
