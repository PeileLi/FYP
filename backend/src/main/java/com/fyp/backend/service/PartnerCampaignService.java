package com.fyp.backend.service;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.repository.CampaignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PartnerCampaignService {

    private final CampaignRepository campaignRepository;

    public List<Map<String, Object>> getCampaigns(String status) {
        List<Campaign> campaigns = (status != null && !status.isBlank())
                ? campaignRepository.findByStatusOrderByCreatedAtDesc(status)
                : campaignRepository.findAllByOrderByCreatedAtDesc();
        return campaigns.stream().map(this::toMap).toList();
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
