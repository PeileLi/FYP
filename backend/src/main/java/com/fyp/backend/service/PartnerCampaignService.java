package com.fyp.backend.service;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PartnerCampaignService {

    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;

    public List<Map<String, Object>> getCampaigns(String status) {
        List<Campaign> campaigns = (status != null && !status.isBlank())
                ? campaignRepository.findByStatusOrderByCreatedAtDesc(status)
                : campaignRepository.findAllByOrderByCreatedAtDesc();
        return campaigns.stream().map(this::toMap).toList();
    }

    @Transactional
    public Map<String, Object> endorse(Long campaignId, String note) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User partner = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        campaign.setPartnerEndorsed(true);
        campaign.setPartnerNote(note);
        campaign.setEndorsedBy(partner);
        campaign.setEndorsedAt(LocalDateTime.now());
        campaignRepository.save(campaign);

        return toMap(campaign);
    }

    @Transactional
    public Map<String, Object> revokeEndorsement(Long campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        campaign.setPartnerEndorsed(false);
        campaign.setPartnerNote(null);
        campaign.setEndorsedBy(null);
        campaign.setEndorsedAt(null);
        campaignRepository.save(campaign);

        return toMap(campaign);
    }

    private Map<String, Object> toMap(Campaign c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("title", c.getTitle());
        m.put("category", c.getCategory());
        m.put("status", c.getStatus());
        m.put("goalAmount", c.getGoalAmount());
        m.put("currentAmount", c.getCurrentAmount());
        m.put("organizer", c.getOrganizer() != null ? c.getOrganizer().getDisplayName() : "—");
        m.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
        m.put("partnerEndorsed", Boolean.TRUE.equals(c.getPartnerEndorsed()));
        m.put("partnerNote", c.getPartnerNote());
        m.put("endorsedBy", c.getEndorsedBy() != null ? c.getEndorsedBy().getDisplayName() : null);
        m.put("endorsedAt", c.getEndorsedAt() != null ? c.getEndorsedAt().toString() : null);
        return m;
    }
}
