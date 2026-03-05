package com.fyp.backend.controller;

import com.fyp.backend.service.AuditTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partner/tasks")
@PreAuthorize("hasRole('PARTNER')")
@RequiredArgsConstructor
public class AuditTaskController {

    private final AuditTaskService auditTaskService;

    /** Open tasks — any partner can see and accept these. */
    @GetMapping("/open")
    public ResponseEntity<List<Map<String, Object>>> getOpenTasks() {
        return ResponseEntity.ok(auditTaskService.getOpenTasks());
    }

    /** Tasks accepted by the current partner (in-progress). */
    @GetMapping("/mine")
    public ResponseEntity<List<Map<String, Object>>> getMyAcceptedTasks() {
        return ResponseEntity.ok(auditTaskService.getMyAcceptedTasks());
    }

    /** Tasks completed by the current partner. */
    @GetMapping("/completed")
    public ResponseEntity<List<Map<String, Object>>> getMyCompletedTasks() {
        return ResponseEntity.ok(auditTaskService.getMyCompletedTasks());
    }

    /** Decline logs for a specific task. */
    @GetMapping("/{id}/decline-logs")
    public ResponseEntity<List<Map<String, Object>>> getDeclineLogs(@PathVariable Long id) {
        return ResponseEntity.ok(auditTaskService.getDeclineLogs(id));
    }

    /** Accept an open task. */
    @PostMapping("/{id}/accept")
    public ResponseEntity<Map<String, Object>> accept(@PathVariable Long id) {
        return ResponseEntity.ok(auditTaskService.acceptTask(id));
    }

    /** Decline a task (reason required). */
    @PostMapping("/{id}/decline")
    public ResponseEntity<Map<String, Object>> decline(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "").trim();
        return ResponseEntity.ok(auditTaskService.declineTask(id, reason));
    }
}
