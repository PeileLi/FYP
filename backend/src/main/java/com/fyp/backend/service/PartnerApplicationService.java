package com.fyp.backend.service;

import com.fyp.backend.dto.ApprovePartnerRequest;
import com.fyp.backend.dto.PartnerApplicationRequest;
import com.fyp.backend.dto.PartnerApplicationResponse;
import com.fyp.backend.dto.RejectPartnerRequest;
import com.fyp.backend.model.PartnerApplication;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.PartnerApplicationRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerApplicationService {

    private final PartnerApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public PartnerApplicationResponse submitApplication(PartnerApplicationRequest request) {
        if (applicationRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("An application with this email already exists");
        }
        if (userRepository.existsByUsername(request.getEmail())) {
            throw new RuntimeException("An account with this username already exists");
        }

        PartnerApplication application = PartnerApplication.builder()
                .organizationName(request.getOrganizationName())
                .email(request.getEmail())
                .description(request.getDescription())
                .status(PartnerApplication.Status.PENDING)
                .build();

        PartnerApplication saved = applicationRepository.save(application);
        log.info("New partner application submitted: {} ({})", request.getOrganizationName(), request.getEmail());
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PartnerApplicationResponse> getAllApplications() {
        return applicationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PartnerApplicationResponse> getApplicationsByStatus(String status) {
        PartnerApplication.Status s = PartnerApplication.Status.valueOf(status.toUpperCase());
        return applicationRepository.findByStatusOrderByCreatedAtDesc(s)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, String> approveApplication(Long id, ApprovePartnerRequest request) {
        PartnerApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (application.getStatus() != PartnerApplication.Status.PENDING) {
            throw new RuntimeException("Application has already been processed");
        }

        String partnerUsername = application.getOrganizationName()
                .toLowerCase().replaceAll("[^a-z0-9_]", "_").replaceAll("_+", "_");
        if (userRepository.existsByUsername(partnerUsername)) {
            throw new RuntimeException("Username '" + partnerUsername + "' already exists");
        }

        // Generate a temporary password if not provided
        String rawPassword = (request != null && request.getTempPassword() != null && !request.getTempPassword().isBlank())
                ? request.getTempPassword()
                : generateTempPassword();

        // Create PARTNER user account
        User partnerUser = User.builder()
                .username(partnerUsername)
                .displayName(application.getOrganizationName())
                .password(passwordEncoder.encode(rawPassword))
                .role(User.Role.PARTNER)
                .enabled(true)
                .build();
        userRepository.save(partnerUser);

        application.setStatus(PartnerApplication.Status.APPROVED);
        applicationRepository.save(application);

        log.info("Partner application approved: {} ({}), account created", application.getOrganizationName(), application.getEmail());

        return Map.of(
                "message", "Application approved and account created",
                "username", partnerUsername,
                "tempPassword", rawPassword
        );
    }

    @Transactional
    public PartnerApplicationResponse rejectApplication(Long id, RejectPartnerRequest request) {
        PartnerApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (application.getStatus() != PartnerApplication.Status.PENDING) {
            throw new RuntimeException("Application has already been processed");
        }

        application.setStatus(PartnerApplication.Status.REJECTED);
        if (request != null && request.getReason() != null) {
            application.setRejectionReason(request.getReason());
        }
        PartnerApplication saved = applicationRepository.save(application);
        log.info("Partner application rejected: {} ({})", application.getOrganizationName(), application.getEmail());
        return mapToResponse(saved);
    }

    private String generateTempPassword() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            sb.append(PASSWORD_CHARS.charAt(RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }

    private PartnerApplicationResponse mapToResponse(PartnerApplication app) {
        return PartnerApplicationResponse.builder()
                .id(app.getId())
                .organizationName(app.getOrganizationName())
                .email(app.getEmail())
                .description(app.getDescription())
                .status(app.getStatus().name())
                .rejectionReason(app.getRejectionReason())
                .createdAt(app.getCreatedAt())
                .updatedAt(app.getUpdatedAt())
                .build();
    }
}
