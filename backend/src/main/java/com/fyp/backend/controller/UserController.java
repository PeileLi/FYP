package com.fyp.backend.controller;

import com.fyp.backend.dto.UpdateProfileRequest;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("username", user.getUsername());
        profile.put("displayName", user.getDisplayName());
        profile.put("avatarUrl", user.getAvatarUrl());
        profile.put("role", user.getRole().name());
        profile.put("createdAt", user.getCreatedAt());

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getDisplayName() != null && !request.getDisplayName().trim().isEmpty()) {
            // Check if display name is already taken by another user
            if (!request.getDisplayName().equals(user.getDisplayName()) &&
                    userRepository.existsByDisplayName(request.getDisplayName())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Display name already taken"));
            }
            user.setDisplayName(request.getDisplayName());
        }

        // Update avatar URL if provided
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Profile updated successfully");
        response.put("displayName", user.getDisplayName());
        response.put("avatarUrl", user.getAvatarUrl());
        response.put("username", user.getUsername());
        response.put("role", user.getRole().name());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newPassword = request.get("newPassword");

        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password is required"));
        }

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password must be at least 6 characters"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }
}
