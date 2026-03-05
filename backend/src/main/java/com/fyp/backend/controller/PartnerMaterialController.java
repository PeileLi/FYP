package com.fyp.backend.controller;

import com.fyp.backend.service.PartnerMaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partner/campaigns")
@RequiredArgsConstructor
public class PartnerMaterialController {

    private final PartnerMaterialService materialService;

    // ── Read-only detail (PARTNER) ────────────────────────────────────────────

    @GetMapping("/{id}/detail")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(materialService.getCampaignDetail(id));
    }

    // ── Verification (PARTNER) ────────────────────────────────────────────────

    @PostMapping("/{id}/verification")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<Map<String, Object>> submitVerification(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(materialService.submitVerification(
                id,
                body.get("checklist"),
                body.get("overallNote"),
                body.getOrDefault("overallStatus", "PARTIAL")));
    }

    @GetMapping("/{id}/verifications")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<List<Map<String, Object>>> getVerifications(@PathVariable Long id) {
        return ResponseEntity.ok(materialService.getVerifications(id));
    }

    @GetMapping("/{id}/chain-records")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<Map<String, Object>> getChainRecords(@PathVariable Long id) {
        return ResponseEntity.ok(materialService.getChainRecords(id));
    }

    // ── Organiser: submit documents and updates (INITIATOR or USER) ───────────

    @PostMapping("/{id}/documents")
    @PreAuthorize("hasAnyRole('INITIATOR','USER','PARTNER','ADMIN')")
    public ResponseEntity<Map<String, Object>> addDocument(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(materialService.addDocument(
                id,
                body.getOrDefault("docType", "OTHER"),
                body.get("name"),
                body.get("url"),
                body.get("description")));
    }

    @PostMapping("/{id}/updates")
    @PreAuthorize("hasAnyRole('INITIATOR','USER','PARTNER','ADMIN')")
    public ResponseEntity<Map<String, Object>> addUpdate(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(materialService.addUpdate(id, body.get("content")));
    }

    @PutMapping("/{id}/fund-usage-plan")
    @PreAuthorize("hasAnyRole('INITIATOR','USER','PARTNER','ADMIN')")
    public ResponseEntity<Void> updateFundUsagePlan(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        materialService.updateFundUsagePlan(id, body.get("plan"));
        return ResponseEntity.ok().build();
    }
}
