package com.fyp.backend.controller;

import com.fyp.backend.service.UserAdminService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class UserAdminController {

    @Autowired
    private UserAdminService userAdminService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        return ResponseEntity.ok(userAdminService.getAllUsers());
    }

    @GetMapping("/{id}/activity")
    public ResponseEntity<Map<String, Object>> getUserActivity(@PathVariable Long id) {
        return ResponseEntity.ok(userAdminService.getUserActivity(id));
    }

    @PostMapping("/{id}/toggle-enabled")
    public ResponseEntity<Map<String, String>> toggleEnabled(@PathVariable Long id) {
        userAdminService.toggleUserEnabled(id);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
