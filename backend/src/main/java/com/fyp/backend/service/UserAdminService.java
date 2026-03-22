package com.fyp.backend.service;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.Donation;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.DonationRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class UserAdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private DonationRepository donationRepository;

    public List<Map<String, Object>> getAllUsers() {
        List<User> users = userRepository.findAllByOrderByCreatedAtDesc();
        List<Map<String, Object>> result = new ArrayList<>();

        for (User u : users) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", u.getId());
            entry.put("displayName", u.getDisplayName());
            entry.put("orgName", u.getOrgName());
            entry.put("username", u.getUsername());
            entry.put("role", u.getRole().name());
            entry.put("roleLabel", toRoleLabel(u.getRole().name()));
            entry.put("enabled", u.getEnabled());
            entry.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : "");
            entry.put("avatarUrl", u.getAvatarUrl());

            long campaignCount = campaignRepository.countByOrganizer(u);
            long donationCount = donationRepository.countByUser(u);
            entry.put("campaignCount", campaignCount);
            entry.put("donationCount", donationCount);

            result.add(entry);
        }
        return result;
    }

    public Map<String, Object> getUserActivity(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> activity = new LinkedHashMap<>();
        activity.put("userId", user.getId());
        activity.put("displayName", user.getDisplayName());
        activity.put("orgName", user.getOrgName());
        activity.put("username", user.getUsername());
        activity.put("role", user.getRole().name());
        activity.put("roleLabel", toRoleLabel(user.getRole().name()));

        // Campaigns created
        List<Campaign> campaigns = campaignRepository.findByOrganizerOrderByCreatedAtDesc(user);
        List<Map<String, Object>> campaignList = new ArrayList<>();
        for (Campaign c : campaigns) {
            Map<String, Object> cm = new LinkedHashMap<>();
            cm.put("id", c.getId());
            cm.put("title", c.getTitle());
            cm.put("status", c.getStatus());
            cm.put("category", c.getCategory());
            cm.put("goalAmount", c.getGoalAmount());
            cm.put("currentAmount", c.getCurrentAmount());
            cm.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
            cm.put("onChain", c.getBlockchainTxId() != null);
            campaignList.add(cm);
        }
        activity.put("campaigns", campaignList);

        // Donations made
        List<Donation> donations = donationRepository.findByUserOrderByDonationDateDesc(user);
        List<Map<String, Object>> donationList = new ArrayList<>();
        for (Donation d : donations) {
            Map<String, Object> dm = new LinkedHashMap<>();
            dm.put("id", d.getId());
            dm.put("campaignTitle", d.getCampaign() != null ? d.getCampaign().getTitle() : "—");
            dm.put("campaignId", d.getCampaign() != null ? d.getCampaign().getId() : null);
            dm.put("amount", d.getAmount());
            dm.put("displayName", d.getDisplayName());
            dm.put("anonymous", d.getIsAnonymous());
            dm.put("status", d.getStatus());
            dm.put("date", d.getDonationDate() != null ? d.getDonationDate().toString() : "");
            dm.put("onChain", d.getTransactionHash() != null);
            donationList.add(dm);
        }
        activity.put("donations", donationList);

        return activity;
    }

    public void toggleUserEnabled(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setEnabled(!user.getEnabled());
        user.setUpdatedAt(java.time.LocalDateTime.now());
        userRepository.save(user);
    }

    private String toRoleLabel(String role) {
        return switch (role) {
            case "ADMIN" -> "Administrator";
            case "INITIATOR" -> "Campaign Creator";
            case "PARTNER" -> "Third-party Auditor";
            default -> "Donor";
        };
    }
}
