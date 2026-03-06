package com.fyp.backend.service;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.Donation;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.DonationRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final CampaignRepository campaignRepository;
    private final DonationRepository donationRepository;

    public Map<String, Object> getSummary() {
        Map<String, Object> m = new LinkedHashMap<>();

        // ── Core counts ──────────────────────────────────
        m.put("totalUsers",     userRepository.count());
        m.put("activeUsers",    userRepository.countByEnabled(true));
        m.put("totalCampaigns", campaignRepository.count());
        m.put("totalDonations", donationRepository.count());

        // ── Financial ────────────────────────────────────
        BigDecimal totalRaised = donationRepository.getTotalDonationAmount();
        m.put("totalRaised", totalRaised != null ? totalRaised : BigDecimal.ZERO);

        // Today
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd   = todayStart.plusDays(1);
        long todayCount     = donationRepository.countByDonationDateBetween(todayStart, todayEnd);
        BigDecimal todayAmt = donationRepository.sumAmountBetween(todayStart, todayEnd);
        m.put("todayDonations",   todayCount);
        m.put("todayAmount",      todayAmt != null ? todayAmt : BigDecimal.ZERO);

        // This month
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        BigDecimal monthAmt = donationRepository.sumAmountSince(monthStart);
        m.put("monthAmount", monthAmt != null ? monthAmt : BigDecimal.ZERO);

        // ── Campaign status breakdown ─────────────────────
        List<Object[]> statusRows = campaignRepository.countByStatusGroup();
        Map<String, Long> campaignByStatus = new LinkedHashMap<>();
        for (Object[] row : statusRows) {
            campaignByStatus.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        m.put("campaignByStatus", campaignByStatus);

        // ── User role breakdown ───────────────────────────
        List<Object[]> roleRows = userRepository.countByRole();
        Map<String, Long> userByRole = new LinkedHashMap<>();
        for (Object[] row : roleRows) {
            userByRole.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        m.put("userByRole", userByRole);

        // ── 14-day trends ─────────────────────────────────
        LocalDateTime twoWeeksAgo = LocalDateTime.now().minusDays(14);

        List<Object[]> donationTrend = donationRepository.dailyStatsSince(twoWeeksAgo);
        List<Map<String, Object>> donationTrendList = new ArrayList<>();
        for (Object[] row : donationTrend) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date",   row[0] != null ? row[0].toString() : "");
            entry.put("count",  row[1]);
            entry.put("amount", row[2]);
            donationTrendList.add(entry);
        }
        m.put("donationTrend", donationTrendList);

        List<Object[]> userTrend = userRepository.dailyNewUsersSince(twoWeeksAgo);
        List<Map<String, Object>> userTrendList = new ArrayList<>();
        for (Object[] row : userTrend) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date",  row[0] != null ? row[0].toString() : "");
            entry.put("count", row[1]);
            userTrendList.add(entry);
        }
        m.put("userTrend", userTrendList);

        List<Object[]> campaignTrend = campaignRepository.dailyNewCampaignsSince(twoWeeksAgo);
        List<Map<String, Object>> campaignTrendList = new ArrayList<>();
        for (Object[] row : campaignTrend) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date",  row[0] != null ? row[0].toString() : "");
            entry.put("count", row[1]);
            campaignTrendList.add(entry);
        }
        m.put("campaignTrend", campaignTrendList);

        // ── Recent activity ───────────────────────────────
        List<Donation> recentDonations = donationRepository.findTop5ByOrderByDonationDateDesc();
        List<Map<String, Object>> recentDonList = new ArrayList<>();
        for (Donation d : recentDonations) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id",            d.getId());
            entry.put("displayName",   Boolean.TRUE.equals(d.getIsAnonymous()) ? "Anonymous" : d.getDisplayName());
            entry.put("amount",        d.getAmount());
            entry.put("campaignTitle", d.getCampaign() != null ? d.getCampaign().getTitle() : "—");
            entry.put("date",          d.getDonationDate() != null ? d.getDonationDate().toString() : "");
            recentDonList.add(entry);
        }
        m.put("recentDonations", recentDonList);

        List<Campaign> recentCampaigns = campaignRepository.findTop5ByOrderByCreatedAtDesc();
        List<Map<String, Object>> recentCampList = new ArrayList<>();
        for (Campaign c : recentCampaigns) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id",       c.getId());
            entry.put("title",    c.getTitle());
            entry.put("status",   c.getStatus());
            entry.put("goal",     c.getGoalAmount());
            entry.put("raised",   c.getCurrentAmount());
            entry.put("organizer", c.getOrganizer() != null ? c.getOrganizer().getDisplayName() : "—");
            entry.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
            recentCampList.add(entry);
        }
        m.put("recentCampaigns", recentCampList);

        List<User> recentUsers = userRepository.findAllByOrderByCreatedAtDesc();
        List<Map<String, Object>> recentUserList = new ArrayList<>();
        for (User u : recentUsers.stream().limit(5).toList()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id",          u.getId());
            entry.put("displayName", u.getDisplayName());
            entry.put("username",    u.getUsername());
            entry.put("role",        u.getRole() != null ? u.getRole().name() : "USER");
            entry.put("createdAt",   u.getCreatedAt() != null ? u.getCreatedAt().toString() : "");
            recentUserList.add(entry);
        }
        m.put("recentUsers", recentUserList);

        return m;
    }
}
