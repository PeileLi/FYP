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

    /** Accept an open task. */
    @PostMapping("/{id}/accept")
    public ResponseEntity<Map<String, Object>> accept(@PathVariable Long id) {
        return ResponseEntity.ok(auditTaskService.acceptTask(id));
    }
}
