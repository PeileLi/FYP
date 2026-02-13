package com.fyp.backend.controller;

import com.fyp.backend.dto.CreateDonationRequest;
import com.fyp.backend.dto.DonationResponse;
import com.fyp.backend.service.DonationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/donations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DonationController {

    private final DonationService donationService;

    @PostMapping
    public ResponseEntity<?> createDonation(@RequestBody CreateDonationRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null
                || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            log.warn("Donation request rejected - not authenticated");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("message", "Unauthorized"));
        }
        
        String email = authentication.getName();
        log.info("Donation request ACCEPTED for user: {}", email);
        
        try {
            DonationResponse response = donationService.createDonation(request, email);
            log.info("Donation created successfully with ID: {}", response.getId());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Donation creation failed for user {}: {}", email, e.getMessage(), e);
            // Return proper error status instead of letting the exception propagate
            // (unhandled exceptions cause Spring to forward to /error which may return wrong status codes)
            String message = e.getMessage() != null ? e.getMessage() : "Failed to create donation";
            if (message.contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(java.util.Map.of("message", message));
            }
            if (message.contains("not active")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(java.util.Map.of("message", message));
            }
            if (message.contains("Invalid")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(java.util.Map.of("message", message));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Failed to process donation. Please try again."));
        }
    }

    @GetMapping("/my-history")
    public ResponseEntity<?> getMyDonationHistory() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("message", "Unauthorized"));
        }
        String email = authentication.getName();
        return ResponseEntity.ok(donationService.getUserDonations(email));
    }

    @GetMapping("/campaign/{campaignId}")
    public ResponseEntity<List<DonationResponse>> getCampaignDonations(@PathVariable Long campaignId) {
        return ResponseEntity.ok(donationService.getCampaignDonations(campaignId));
    }
}
