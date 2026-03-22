package com.fyp.backend.controller;

import com.fyp.backend.service.CampaignService;
import com.fyp.backend.service.PartnerAuditService;
import com.fyp.backend.service.PartnerScopeService;
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
    private final CampaignService campaignService;
    private final PartnerScopeService scopeService;

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

    @PostMapping("/campaigns/{id}/freeze")
    public ResponseEntity<?> freezeCampaign(@PathVariable Long id, @RequestBody Map<String, String> body) {
        scopeService.requireFullAccess(id);
        String reason = body.getOrDefault("reason", "");
        return ResponseEntity.ok(campaignService.freezeCampaign(id, reason));
    }

    @PostMapping("/campaigns/{id}/close")
    public ResponseEntity<?> closeCampaign(@PathVariable Long id, @RequestBody Map<String, String> body) {
        scopeService.requireFullAccess(id);
        String reason = body.getOrDefault("reason", "");
        return ResponseEntity.ok(campaignService.closeCampaignByPartner(id, reason));
    }

    @PostMapping("/campaigns/{id}/review-unfreeze")
    public ResponseEntity<?> reviewUnfreeze(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        scopeService.requireFullAccess(id);
        boolean approved = Boolean.TRUE.equals(body.get("approved"));
        return ResponseEntity.ok(campaignService.reviewUnfreeze(id, approved));
    }
}
