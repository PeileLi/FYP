package com.fyp.backend.controller;

import com.fyp.backend.dto.CreateDonationRequest;
import com.fyp.backend.dto.DonationResponse;
import com.fyp.backend.service.DonationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/donations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DonationController {

    private final DonationService donationService;

    @PostMapping
    public ResponseEntity<DonationResponse> createDonation(@RequestBody CreateDonationRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        DonationResponse response = donationService.createDonation(request, email);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-history")
    public ResponseEntity<List<DonationResponse>> getMyDonationHistory() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return ResponseEntity.ok(donationService.getUserDonations(email));
    }

    @GetMapping("/campaign/{campaignId}")
    public ResponseEntity<List<DonationResponse>> getCampaignDonations(@PathVariable Long campaignId) {
        return ResponseEntity.ok(donationService.getCampaignDonations(campaignId));
    }
}

