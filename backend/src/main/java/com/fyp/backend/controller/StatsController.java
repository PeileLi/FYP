package com.fyp.backend.controller;

import com.fyp.backend.model.Donation;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.DonationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

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

        BigDecimal totalRaised = donationRepository.getTotalDonationAmount();
        stats.put("totalRaised", totalRaised != null ? totalRaised : BigDecimal.ZERO);

        long donorCount = donationRepository.countDistinctDonors();
        stats.put("donorCount", donorCount);

        long successfulProjects = campaignRepository.countByStatus("COMPLETED");
        stats.put("successfulProjects", successfulProjects);

        long totalCampaigns = campaignRepository.count();
        stats.put("totalCampaigns", totalCampaigns);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/recent-donations")
    public ResponseEntity<?> getRecentDonations() {
        List<Donation> donations = donationRepository.findTop20ByOrderByDonationDateDesc();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Donation d : donations) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("displayName", d.getDisplayName() != null ? d.getDisplayName() : "Anonymous");
            item.put("amount", d.getAmount());
            item.put("date", d.getDonationDate());
            item.put("campaignTitle", d.getCampaign() != null ? d.getCampaign().getTitle() : "");
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }
}
