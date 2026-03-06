package com.fyp.backend.controller;

import com.fyp.backend.service.PartnerCampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partner/campaigns")
@PreAuthorize("hasRole('PARTNER')")
@RequiredArgsConstructor
public class PartnerCampaignController {

    private final PartnerCampaignService partnerCampaignService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getCampaigns(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(partnerCampaignService.getCampaigns(status));
    }

}
