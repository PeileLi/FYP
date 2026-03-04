package com.fyp.backend.controller;

import com.fyp.backend.service.FabricAdminService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/blockchain")
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class BlockchainAdminController {

    @Autowired
    private FabricAdminService fabricAdminService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getNetworkStats() {
        return ResponseEntity.ok(fabricAdminService.getNetworkStats());
    }

    @GetMapping("/nodes")
    public ResponseEntity<List<Map<String, Object>>> getNodeStatus() {
        return ResponseEntity.ok(fabricAdminService.getNodeStatus());
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<Map<String, Object>>> getTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(fabricAdminService.getTransactions(page, size));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<Map<String, Object>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(fabricAdminService.getAuditLogs(page, size));
    }

    @GetMapping("/block/{blockNum}")
    public ResponseEntity<Map<String, Object>> getBlock(@PathVariable long blockNum) {
        return ResponseEntity.ok(fabricAdminService.getBlockByNumber(blockNum));
    }
}
