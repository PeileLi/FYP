package com.fyp.backend.controller;

import com.fyp.backend.dto.CampaignResponse;
import com.fyp.backend.dto.CreateCampaignRequest;
import com.fyp.backend.service.CampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping
    public ResponseEntity<CampaignResponse> createCampaign(@RequestBody CreateCampaignRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        CampaignResponse response = campaignService.createCampaign(request, email);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<CampaignResponse>> getAllCampaigns(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category) {
        
        if (category != null && !category.isEmpty()) {
            return ResponseEntity.ok(campaignService.getCampaignsByCategory(category));
        }
        
        if ("active".equalsIgnoreCase(status)) {
            return ResponseEntity.ok(campaignService.getAllActiveCampaigns());
        }
        
        return ResponseEntity.ok(campaignService.getAllCampaigns());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CampaignResponse> getCampaignById(@PathVariable Long id) {
        CampaignResponse response = campaignService.getCampaignById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get campaign by blockchain transaction ID
     * Only queries from database, blockchain is used only for evidence storage
     * 通过区块链证书ID获取项目，仅从数据库查询，区块链仅作为证据储存
     */
    @GetMapping("/by-txid")
    public ResponseEntity<CampaignResponse> getCampaignByTxId(@RequestParam String txId) {
        CampaignResponse response = campaignService.getCampaignByBlockchainTxId(txId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-campaigns")
    public ResponseEntity<List<CampaignResponse>> getMyCampaigns() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        List<CampaignResponse> campaigns = campaignService.getUserCampaigns(email);
        return ResponseEntity.ok(campaigns);
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<CampaignResponse> closeCampaign(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        CampaignResponse response = campaignService.closeCampaign(id, email);
        return ResponseEntity.ok(response);
    }
}
