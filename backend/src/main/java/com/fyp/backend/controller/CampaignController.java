package com.fyp.backend.controller;

import com.fyp.backend.dto.CampaignResponse;
import com.fyp.backend.dto.CreateCampaignRequest;
import com.fyp.backend.service.CampaignService;
import com.fyp.backend.service.WithdrawalService;
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
    private final WithdrawalService withdrawalService;

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
            @RequestParam(required = false) String category) {
        try {
            if (category != null && !category.isEmpty()) {
                return ResponseEntity.ok(campaignService.getCampaignsByCategory(category));
            }

            return ResponseEntity.ok(campaignService.getAllActiveCampaigns());
        } catch (RuntimeException e) {
            log.error("Failed to get campaigns: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCampaignById(@PathVariable Long id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String callerUsername = null;
            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getPrincipal().toString())) {
                callerUsername = authentication.getName();
            }
            CampaignResponse response = campaignService.getCampaignById(id, callerUsername);
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

    @PutMapping("/{id}/cover")
    public ResponseEntity<?> setCoverImage(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required"));
        }
        try {
            String imageUrl = body.get("imageUrl");
            if (imageUrl == null || imageUrl.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "imageUrl is required"));
            }
            String email = authentication.getName();
            CampaignResponse response = campaignService.setCoverImage(id, imageUrl, email);
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Failed to set cover image: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
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

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCampaign(@PathVariable Long id, @RequestBody CreateCampaignRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        try {
            String email = authentication.getName();
            CampaignResponse response = campaignService.updateCampaign(id, request, email);
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<?> addDocuments(@PathVariable Long id, @RequestBody List<CreateCampaignRequest.DocumentItem> documents) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        try {
            String email = authentication.getName();
            campaignService.addDocumentsToCampaign(id, documents, email);
            return ResponseEntity.ok(Map.of("message", "Documents added"));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/withdraw")
    public ResponseEntity<?> requestWithdrawal(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        try {
            String email = authentication.getName();
            java.math.BigDecimal amount = new java.math.BigDecimal(body.get("amount").toString());
            return ResponseEntity.ok(withdrawalService.requestWithdrawal(id, amount, email));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/withdrawals")
    public ResponseEntity<?> getCampaignWithdrawals(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(withdrawalService.getCampaignWithdrawals(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/withdrawals/{withdrawalId}/evidence")
    public ResponseEntity<?> submitWithdrawalEvidence(@PathVariable Long withdrawalId, @RequestBody Map<String, String> body) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        try {
            String email = authentication.getName();
            String evidenceUrls = body.get("evidenceUrls");
            String description = body.get("description");
            return ResponseEntity.ok(withdrawalService.submitEvidence(withdrawalId, evidenceUrls, description, email));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }
}
