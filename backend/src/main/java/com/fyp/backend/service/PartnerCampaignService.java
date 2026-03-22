package com.fyp.backend.service;

import com.fyp.backend.model.AuditTask;
import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.AuditTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PartnerCampaignService {

    private final AuditTaskRepository auditTaskRepository;
    private final PartnerScopeService scopeService;

    public List<Map<String, Object>> getCampaigns(String status) {
        User partner = scopeService.currentPartner();

        List<Campaign> campaigns = auditTaskRepository.findByAssignedPartner(partner)
                .stream().map(AuditTask::getCampaign).toList();

        return campaigns.stream()
                .filter(c -> status == null || status.isBlank() || status.equals(c.getStatus()))
                .map(this::toMap).toList();
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
