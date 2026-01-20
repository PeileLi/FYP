package com.fyp.backend.controller;

import com.fyp.backend.dto.BlockchainCertificateResponse;
import com.fyp.backend.service.BlockchainService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/blockchain")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BlockchainController {

    private final BlockchainService blockchainService;

    @GetMapping("/verify/{campaignId}")
    public ResponseEntity<BlockchainCertificateResponse> verifyCampaign(@PathVariable String campaignId) {
        BlockchainCertificateResponse response = blockchainService.verifyCampaign(campaignId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<BlockchainCertificateResponse> searchByTxId(@RequestParam String txId) {
        BlockchainCertificateResponse response = blockchainService.searchByTxId(txId);
        return ResponseEntity.ok(response);
    }
}
