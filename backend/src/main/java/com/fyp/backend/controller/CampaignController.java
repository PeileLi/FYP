package com.fyp.backend.controller;

import com.fyp.backend.dto.CampaignResponse;
import com.fyp.backend.dto.CreateCampaignRequest;
import com.fyp.backend.service.CampaignService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping
    public ResponseEntity<?> createCampaign(@RequestBody CreateCampaignRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required"));
        }
        try {
            String email = authentication.getName();
            CampaignResponse response = campaignService.createCampaign(request, email);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Failed to create campaign: {}", e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllCampaigns(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category) {
        try {
            if (category != null && !category.isEmpty()) {
                return ResponseEntity.ok(campaignService.getCampaignsByCategory(category));
            }

            if ("active".equalsIgnoreCase(status)) {
                return ResponseEntity.ok(campaignService.getAllActiveCampaigns());
            }

            return ResponseEntity.ok(campaignService.getAllCampaigns());
        } catch (RuntimeException e) {
            log.error("Failed to get campaigns: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCampaignById(@PathVariable Long id) {
        try {
            CampaignResponse response = campaignService.getCampaignById(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get campaign by blockchain transaction ID
     * Only queries from database, blockchain is used only for evidence storage
     */
    @GetMapping("/by-txid")
    public ResponseEntity<?> getCampaignByTxId(@RequestParam String txId) {
        try {
            CampaignResponse response = campaignService.getCampaignByBlockchainTxId(txId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my-campaigns")
    public ResponseEntity<?> getMyCampaigns() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required"));
        }
        try {
            String email = authentication.getName();
            List<CampaignResponse> campaigns = campaignService.getUserCampaigns(email);
            return ResponseEntity.ok(campaigns);
        } catch (RuntimeException e) {
            log.error("Failed to get user campaigns: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<?> closeCampaign(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required"));
        }
        try {
            String email = authentication.getName();
            CampaignResponse response = campaignService.closeCampaign(id, email);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Failed to close campaign: {}", e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", e.getMessage()));
            }
            if (e.getMessage() != null && e.getMessage().contains("Only the campaign organizer")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
