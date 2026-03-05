package com.fyp.backend.controller;

import com.fyp.backend.service.PartnerAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partner/audit")
@PreAuthorize("hasRole('PARTNER')")
@RequiredArgsConstructor
public class PartnerAuditController {

    private final PartnerAuditService partnerAuditService;

    /** List campaigns for review, optionally filtered by auditStatus */
    @GetMapping("/campaigns")
    public ResponseEntity<List<Map<String, Object>>> getCampaigns(
            @RequestParam(required = false) String auditStatus) {
        return ResponseEntity.ok(partnerAuditService.getCampaigns(auditStatus));
    }

    /**
     * Submit audit conclusion for a campaign.
     * Body: { conclusion, evidenceSummary, notes }
     * conclusion: APPROVED | REJECTED | REQUIRES_INFO | RISK_FLAGGED
     * evidenceHash and commentHash are auto-computed by the backend.
     */
    @PostMapping("/campaigns/{id}/submit")
    public ResponseEntity<Map<String, Object>> submitAudit(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String conclusion      = body.getOrDefault("conclusion", "");
        String evidenceSummary = body.getOrDefault("evidenceSummary", "");
        String notes           = body.getOrDefault("notes", "");
        return ResponseEntity.ok(
                partnerAuditService.submitAudit(id, conclusion, evidenceSummary, notes));
    }

    /** Get full audit history for a campaign */
    @GetMapping("/campaigns/{id}/history")
    public ResponseEntity<List<Map<String, Object>>> getAuditHistory(@PathVariable Long id) {
        return ResponseEntity.ok(partnerAuditService.getAuditHistory(id));
    }
}
