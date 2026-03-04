package com.fyp.backend.controller;

import com.fyp.backend.service.CampaignAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/campaigns")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Slf4j
public class CampaignAdminController {

    private final CampaignAdminService campaignAdminService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllCampaigns(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(campaignAdminService.getAllCampaigns(status, keyword));
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "status is required"));
        }
        List<String> allowed = List.of("PENDING", "ACTIVE", "SUSPENDED", "COMPLETED", "CLOSED");
        if (!allowed.contains(newStatus)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + newStatus));
        }
        return ResponseEntity.ok(campaignAdminService.updateStatus(id, newStatus));
    }
}
