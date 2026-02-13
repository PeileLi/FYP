package com.fyp.backend.controller;

import com.fyp.backend.dto.BlockchainCertificateResponse;
import com.fyp.backend.service.BlockchainService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/blockchain")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class BlockchainController {

    private final BlockchainService blockchainService;

    @GetMapping("/verify/{campaignId}")
    public ResponseEntity<?> verifyCampaign(@PathVariable String campaignId) {
        try {
            BlockchainCertificateResponse response = blockchainService.verifyCampaign(campaignId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Failed to verify campaign {}: {}", campaignId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Verification failed: " + e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchByTxId(@RequestParam String txId) {
        try {
            BlockchainCertificateResponse response = blockchainService.searchByTxId(txId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Failed to search by TxId {}: {}", txId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Search failed: " + e.getMessage()));
        }
    }
}
