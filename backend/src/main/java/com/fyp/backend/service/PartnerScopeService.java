package com.fyp.backend.service;

import com.fyp.backend.model.AuditTask;
import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.AuditTaskRepository;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Enforces partner data access.
 *
 *  NONE        — no audit task exists for this campaign
 *  FULL_ACCESS — an OPEN, ACCEPTED, or COMPLETED task exists; any authenticated partner may audit
 */
@Service
@RequiredArgsConstructor
public class PartnerScopeService {

    public enum ScopeLevel { NONE, FULL_ACCESS }

    private final AuditTaskRepository taskRepo;
    private final CampaignRepository  campaignRepo;
    private final UserRepository      userRepo;

    public User currentPartner() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Partner not found"));
    }

    public ScopeLevel scopeFor(Long campaignId) {
        User me = currentPartner();
        return scopeFor(campaignId, me);
    }

    public ScopeLevel scopeFor(Long campaignId, User partner) {
        Campaign c = campaignRepo.findById(campaignId).orElse(null);
        if (c == null) return ScopeLevel.NONE;

        Optional<AuditTask> task = taskRepo.findByCampaign(c);
        if (task.isEmpty()) return ScopeLevel.NONE;

        AuditTask t = task.get();
        if (t.getStatus() == AuditTask.Status.COMPLETED) {
            return ScopeLevel.NONE;
        }
        return ScopeLevel.FULL_ACCESS;
    }

    public void requireFullAccess(Long campaignId) {
        ScopeLevel level = scopeFor(campaignId);
        if (level != ScopeLevel.FULL_ACCESS) {
            throw new SecurityException("Access denied: no open audit task for this campaign");
        }
    }
}
