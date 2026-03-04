package com.fyp.backend.controller;

import com.fyp.backend.service.DonationAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/donations")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class DonationAdminController {

    private final DonationAdminService donationAdminService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getDonations(
            @RequestParam(required = false) Long campaignId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(donationAdminService.getDonations(campaignId, status, from, to));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(donationAdminService.getStats());
    }

    @GetMapping("/{id}/verify")
    public ResponseEntity<Map<String, Object>> verifyTransaction(@PathVariable Long id) {
        return ResponseEntity.ok(donationAdminService.verifyTransaction(id));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) Long campaignId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        String csv = donationAdminService.exportCsv(campaignId, status, from, to);
        String filename = "donations-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")) + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
