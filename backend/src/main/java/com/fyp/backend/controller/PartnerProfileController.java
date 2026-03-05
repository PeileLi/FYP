package com.fyp.backend.controller;

import com.fyp.backend.service.PartnerProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partner/profile")
@PreAuthorize("hasRole('PARTNER')")
@RequiredArgsConstructor
public class PartnerProfileController {

    private final PartnerProfileService partnerProfileService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getProfile() {
        return ResponseEntity.ok(partnerProfileService.getProfile());
    }

    @PutMapping
    public ResponseEntity<Map<String, Object>> updateProfile(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(partnerProfileService.updateProfile(
                body.get("orgName"),
                body.get("credentialNumber"),
                body.get("fabricMspId"),
                body.get("certSerial")));
    }

    @GetMapping("/fabric-identity")
    public ResponseEntity<Map<String, Object>> getFabricIdentity() {
        return ResponseEntity.ok(partnerProfileService.getFabricIdentity());
    }

    @GetMapping("/permissions")
    public ResponseEntity<Map<String, Object>> getPermissions() {
        return ResponseEntity.ok(partnerProfileService.getPermissions());
    }

    @GetMapping("/my-audits")
    public ResponseEntity<List<Map<String, Object>>> getMyAudits() {
        return ResponseEntity.ok(partnerProfileService.getMyAuditRecords());
    }
}
