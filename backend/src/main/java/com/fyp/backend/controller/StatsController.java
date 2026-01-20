package com.fyp.backend.controller;

import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.DonationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StatsController {

    private final CampaignRepository campaignRepository;
    private final DonationRepository donationRepository;

    @GetMapping("/public")
    public ResponseEntity<?> getPublicStats() {
        Map<String, Object> stats = new HashMap<>();

        // Total amount raised from all donations
        BigDecimal totalRaised = donationRepository.getTotalDonationAmount();
        stats.put("totalRaised", totalRaised != null ? totalRaised : BigDecimal.ZERO);

        // Total number of donors (unique users who made donations)
        long donorCount = donationRepository.countDistinctDonors();
        stats.put("donorCount", donorCount);

        // Total number of successful campaigns (status = 'COMPLETED')
        long successfulProjects = campaignRepository.countByStatus("COMPLETED");
        stats.put("successfulProjects", successfulProjects);

        // Total number of campaigns
        long totalCampaigns = campaignRepository.count();
        stats.put("totalCampaigns", totalCampaigns);

        return ResponseEntity.ok(stats);
    }
}
