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
 * Enforces the "minimum visibility" principle for partner data access.
 *
 *  NONE       — partner has no task relation to this campaign
 *  OPEN_VIEW  — the campaign has an OPEN task; any partner can see basic info only
 *  FULL_ACCESS— the current partner has an ACCEPTED (or COMPLETED) task; full material access
 */
@Service
@RequiredArgsConstructor
public class PartnerScopeService {

    public enum ScopeLevel { NONE, OPEN_VIEW, FULL_ACCESS }

    private final AuditTaskRepository taskRepo;
    private final CampaignRepository  campaignRepo;
    private final UserRepository      userRepo;

    // ── Public helpers ────────────────────────────────────────────────────────

    public User currentPartner() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Partner not found"));
    }

    /**
     * Returns the scope level the current partner has for this campaign.
     */
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
        // ACCEPTED or COMPLETED by this partner → full access
        if (partner.equals(t.getAssignedPartner())
                && (t.getStatus() == AuditTask.Status.ACCEPTED
                 || t.getStatus() == AuditTask.Status.COMPLETED)) {
            return ScopeLevel.FULL_ACCESS;
        }
        // Task is OPEN → any partner sees basic info
        if (t.getStatus() == AuditTask.Status.OPEN) {
            return ScopeLevel.OPEN_VIEW;
        }
        return ScopeLevel.NONE;
    }

    /**
     * Throws 403 if the current partner does not have at least OPEN_VIEW.
     */
    public ScopeLevel requireAtLeastOpenView(Long campaignId) {
        ScopeLevel level = scopeFor(campaignId);
        if (level == ScopeLevel.NONE) {
            throw new SecurityException("Access denied: this campaign is not in your task scope");
        }
        return level;
    }

    /**
     * Throws 403 if the current partner does not have FULL_ACCESS.
     */
    public void requireFullAccess(Long campaignId) {
        ScopeLevel level = scopeFor(campaignId);
        if (level != ScopeLevel.FULL_ACCESS) {
            throw new SecurityException(
                    level == ScopeLevel.NONE
                    ? "Access denied: this campaign is not assigned to you"
                    : "Access denied: accept the task first to access full materials");
        }
    }
}
