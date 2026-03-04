package com.fyp.backend.controller;

import com.fyp.backend.dto.ApprovePartnerRequest;
import com.fyp.backend.dto.PartnerApplicationRequest;
import com.fyp.backend.dto.PartnerApplicationResponse;
import com.fyp.backend.dto.RejectPartnerRequest;
import com.fyp.backend.service.PartnerApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PartnerApplicationController {

    private final PartnerApplicationService applicationService;

    @PostMapping("/partner/apply")
    public ResponseEntity<PartnerApplicationResponse> submitApplication(
            @Valid @RequestBody PartnerApplicationRequest request) {
        return ResponseEntity.ok(applicationService.submitApplication(request));
    }

    @GetMapping("/admin/partner-applications")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PartnerApplicationResponse>> getAllApplications(
            @RequestParam(required = false) String status) {
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(applicationService.getApplicationsByStatus(status));
        }
        return ResponseEntity.ok(applicationService.getAllApplications());
    }

    @PostMapping("/admin/partner-applications/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> approveApplication(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovePartnerRequest request) {
        return ResponseEntity.ok(applicationService.approveApplication(id, request));
    }

    @PostMapping("/admin/partner-applications/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PartnerApplicationResponse> rejectApplication(
            @PathVariable Long id,
            @RequestBody(required = false) RejectPartnerRequest request) {
        return ResponseEntity.ok(applicationService.rejectApplication(id, request));
    }
}
