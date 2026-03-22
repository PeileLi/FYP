package com.fyp.backend.service;

import com.fyp.backend.model.*;
import com.fyp.backend.model.AuditTask.Status;
import com.fyp.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditTaskService {

    private final AuditTaskRepository           taskRepo;
    private final AuditTaskDeclineLogRepository  declineLogRepo;
    private final CampaignRepository            campaignRepo;
    private final UserRepository                userRepo;
    private final PartnerScopeService           scopeService;

    // ── Sync: create tasks for PENDING_AUDIT campaigns ────────────────────────

    @Transactional
    public void syncTasks() {
        campaignRepo.findByAuditStatusOrderByCreatedAtDesc("PENDING_AUDIT").forEach(campaign -> {
            if (!taskRepo.existsByCampaign(campaign)) {
                taskRepo.save(AuditTask.builder().campaign(campaign).status(Status.OPEN).build());
            }
        });
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    /** Open tasks visible to all partners (not yet accepted by anyone). */
    public List<Map<String, Object>> getOpenTasks() {
        syncTasks();
        return taskRepo.findByStatusOrderByCreatedAtAsc(Status.OPEN)
                .stream().map(t -> toMap(t, null)).toList();
    }

    /** Tasks accepted by the current partner (status = ACCEPTED). */
    public List<Map<String, Object>> getMyAcceptedTasks() {
        User me = scopeService.currentPartner();
        return taskRepo.findByAssignedPartnerAndStatusOrderByUpdatedAtDesc(me, Status.ACCEPTED)
                .stream().map(t -> toMap(t, me)).toList();
    }

    /** Completed tasks where current partner was assignee. */
    public List<Map<String, Object>> getMyCompletedTasks() {
        User me = scopeService.currentPartner();
        return taskRepo.findByAssignedPartner(me).stream()
                .filter(t -> t.getStatus() == Status.COMPLETED)
                .sorted(Comparator.comparing(AuditTask::getUpdatedAt).reversed())
                .map(t -> toMap(t, me)).toList();
    }

    /** Decline logs for a task (only accessible if partner was assigned or any partner). */
    public List<Map<String, Object>> getDeclineLogs(Long taskId) {
        AuditTask task = taskRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        return declineLogRepo.findByTaskOrderByCreatedAtDesc(task).stream()
                .map(this::toDeclineMap).toList();
    }

    // ── State transitions ─────────────────────────────────────────────────────

    /**
     * Partner accepts an OPEN task:
     *   task.status → ACCEPTED, task.assignedPartner → me
     *   campaign.auditStatus → UNDER_REVIEW
     */
    @Transactional
    public Map<String, Object> acceptTask(Long taskId) {
        User me = scopeService.currentPartner();
        AuditTask task = taskRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        if (task.getStatus() != Status.OPEN) {
            throw new IllegalStateException("Task is not open (current status: " + task.getStatus() + ")");
        }

        task.setAssignedPartner(me);
        task.setStatus(Status.ACCEPTED);
        taskRepo.save(task);

        Campaign campaign = task.getCampaign();
        campaign.setAuditStatus("UNDER_REVIEW");
        campaignRepo.save(campaign);

        log.info("Partner {} accepted task {} for campaign {}", me.getUsername(), taskId, campaign.getId());
        return toMap(task, me);
    }

    /**
     * Partner declines a task they previously accepted:
     *   log the reason, reset task to OPEN, campaign.auditStatus → PENDING_AUDIT
     * Also allows declining an OPEN task to record that this partner won't take it.
     */
    @Transactional
    public Map<String, Object> declineTask(Long taskId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Decline reason is required");
        }
        User me = scopeService.currentPartner();
        AuditTask task = taskRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        if (task.getStatus() == Status.COMPLETED) {
            throw new IllegalStateException("Cannot decline a completed task");
        }

        // If partner is trying to decline a task assigned to someone else, block it
        if (task.getStatus() == Status.ACCEPTED && !me.equals(task.getAssignedPartner())) {
            throw new IllegalStateException("You are not assigned to this task");
        }

        // Log the decline
        declineLogRepo.save(AuditTaskDeclineLog.builder()
                .task(task)
                .partner(me)
                .reason(reason)
                .build());

        // Reset task to OPEN
        task.setAssignedPartner(null);
        task.setStatus(Status.OPEN);
        taskRepo.save(task);

        // Reset campaign audit status back to pending
        Campaign campaign = task.getCampaign();
        campaign.setAuditStatus("PENDING_AUDIT");
        campaignRepo.save(campaign);

        log.info("Partner {} declined task {} (reason: {})", me.getUsername(), taskId, reason);
        return toMap(task, me);
    }

    /**
     * Called by PartnerAuditService after a successful audit submission.
     * Assigns the submitting partner and marks the task as COMPLETED.
     */
    @Transactional
    public void completeTaskForCampaign(Long campaignId, User partner) {
        campaignRepo.findById(campaignId).ifPresent(campaign ->
            taskRepo.findByCampaign(campaign).ifPresent(task -> {
                if (task.getStatus() != Status.ACCEPTED) {
                    throw new IllegalStateException(
                            "Task must be ACCEPTED before completing (current: " + task.getStatus() + ")");
                }
                if (!partner.equals(task.getAssignedPartner())) {
                    throw new SecurityException("Only the assigned partner can complete this task");
                }
                task.setStatus(Status.COMPLETED);
                taskRepo.save(task);
            })
        );
    }

    // ── Serialisation ─────────────────────────────────────────────────────────

    private Map<String, Object> toMap(AuditTask t, User me) {
        Campaign c = t.getCampaign();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",              t.getId());
        m.put("status",          t.getStatus().name());
        m.put("createdAt",       t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
        m.put("updatedAt",       t.getUpdatedAt() != null ? t.getUpdatedAt().toString() : "");
        m.put("assignedPartner", t.getAssignedPartner() != null ? t.getAssignedPartner().getDisplayName() : null);
        m.put("isAssignedToMe",  me != null && me.equals(t.getAssignedPartner()));

        Map<String, Object> cm = new LinkedHashMap<>();
        cm.put("id",            c.getId());
        cm.put("title",         c.getTitle());
        cm.put("category",      c.getCategory());
        cm.put("description",   c.getDescription());
        cm.put("organizer",     c.getOrganizer() != null ? c.getOrganizer().getDisplayName() : "");
        cm.put("goalAmount",    c.getGoalAmount());
        cm.put("currentAmount", c.getCurrentAmount());
        cm.put("status",        c.getStatus());
        cm.put("auditStatus",   c.getAuditStatus());
        cm.put("createdAt",     c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
        m.put("campaign", cm);

        // Attach recent decline count
        long declines = declineLogRepo.findByTaskOrderByCreatedAtDesc(t).size();
        m.put("declineCount", declines);

        return m;
    }

    private Map<String, Object> toDeclineMap(AuditTaskDeclineLog l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",        l.getId());
        m.put("partner",   l.getPartner() != null ? l.getPartner().getDisplayName() : "");
        m.put("reason",    l.getReason());
        m.put("createdAt", l.getCreatedAt() != null ? l.getCreatedAt().toString() : "");
        return m;
    }
}
