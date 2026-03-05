package com.fyp.backend.service;

import com.fyp.backend.config.FabricConfig;
import com.fyp.backend.model.CampaignAudit;
import com.fyp.backend.model.PartnerProfile;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.CampaignAuditRepository;
import com.fyp.backend.repository.PartnerProfileRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerProfileService {

    private final PartnerProfileRepository profileRepository;
    private final CampaignAuditRepository auditRepository;
    private final UserRepository userRepository;
    private final FabricConfig fabricConfig;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private User currentPartner() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Partner not found"));
    }

    private PartnerProfile getOrCreateProfile(User user) {
        return profileRepository.findByUser(user).orElseGet(() -> {
            PartnerProfile p = PartnerProfile.builder()
                    .user(user)
                    .orgName(user.getDisplayName())
                    .fabricMspId(fabricConfig.getMspId())
                    .build();
            return profileRepository.save(p);
        });
    }

    // ── Profile ──────────────────────────────────────────────────────────────

    public Map<String, Object> getProfile() {
        User partner = currentPartner();
        PartnerProfile profile = getOrCreateProfile(partner);
        return buildProfileMap(partner, profile);
    }

    @Transactional
    public Map<String, Object> updateProfile(String orgName, String credentialNumber,
                                             String fabricMspId, String certSerial) {
        User partner = currentPartner();
        PartnerProfile profile = getOrCreateProfile(partner);

        if (orgName != null && !orgName.isBlank()) {
            profile.setOrgName(orgName);
            partner.setDisplayName(orgName);
            userRepository.save(partner);
        }
        if (credentialNumber != null) profile.setCredentialNumber(credentialNumber);
        if (fabricMspId     != null && !fabricMspId.isBlank()) profile.setFabricMspId(fabricMspId);
        if (certSerial      != null) profile.setCertSerial(certSerial);

        profileRepository.save(profile);
        return buildProfileMap(partner, profile);
    }

    // ── Fabric identity info ──────────────────────────────────────────────────

    public Map<String, Object> getFabricIdentity() {
        User partner = currentPartner();
        PartnerProfile profile = getOrCreateProfile(partner);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("mspId",        profile.getFabricMspId() != null ? profile.getFabricMspId() : fabricConfig.getMspId());
        m.put("channelName",  fabricConfig.getChannelName());
        m.put("chaincodeName", fabricConfig.getChaincodeName());
        m.put("peerEndpoint", fabricConfig.getPeerEndpoint());
        m.put("certPath",     fabricConfig.getCertPath());

        // Read system CA cert details (informational)
        Map<String, Object> certInfo = readSystemCertInfo();
        m.put("systemCert", certInfo);

        // Partner's own cert serial (if set)
        m.put("partnerCertSerial", profile.getCertSerial());

        return m;
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    public Map<String, Object> getPermissions() {
        User partner = currentPartner();
        PartnerProfile profile = getOrCreateProfile(partner);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("role", "PARTNER");
        m.put("orgName", profile.getOrgName() != null ? profile.getOrgName() : partner.getDisplayName());

        List<Map<String, Object>> allowed = new ArrayList<>();
        for (String[] entry : new String[][]{
            {"view_campaigns",    "View all campaigns on the platform"},
            {"submit_audit",      "Submit audit conclusions (Approve / Reject / Requires Info / Flag Risk)"},
            {"upload_evidence",   "Upload evidence summary and evidence hash to blockchain"},
            {"flag_risk",         "Flag suspicious campaigns as risk (auto-suspends on-chain)"},
            {"view_audit_history","View full audit history for any campaign"},
            {"maintain_profile",  "Maintain own organisation profile and credential number"},
        }) {
            Map<String, Object> perm = new LinkedHashMap<>();
            perm.put("key", entry[0]);
            perm.put("description", entry[1]);
            perm.put("granted", true);
            allowed.add(perm);
        }

        List<Map<String, Object>> denied = new ArrayList<>();
        for (String[] entry : new String[][]{
            {"create_campaign",  "Create or modify campaigns"},
            {"make_donation",    "Make donations on the platform"},
            {"approve_campaign", "Change campaign approval status (Admin only)"},
            {"manage_users",     "Manage user accounts (Admin only)"},
            {"admin_panel",      "Access admin panel (Admin only)"},
        }) {
            Map<String, Object> perm = new LinkedHashMap<>();
            perm.put("key", entry[0]);
            perm.put("description", entry[1]);
            perm.put("granted", false);
            denied.add(perm);
        }

        m.put("allowed", allowed);
        m.put("denied", denied);
        return m;
    }

    // ── My Audit Records ──────────────────────────────────────────────────────

    public List<Map<String, Object>> getMyAuditRecords() {
        User partner = currentPartner();
        return auditRepository.findByAuditorOrderByCreatedAtDesc(partner)
                .stream().map(this::toAuditMap).toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Map<String, Object> buildProfileMap(User user, PartnerProfile profile) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("userId",           user.getId());
        m.put("email",            user.getEmail());
        m.put("displayName",      user.getDisplayName());
        m.put("orgName",          profile.getOrgName() != null ? profile.getOrgName() : user.getDisplayName());
        m.put("credentialNumber", profile.getCredentialNumber());
        m.put("fabricMspId",      profile.getFabricMspId() != null ? profile.getFabricMspId() : fabricConfig.getMspId());
        m.put("certSerial",       profile.getCertSerial());
        m.put("updatedAt",        profile.getUpdatedAt() != null ? profile.getUpdatedAt().toString() : "");
        return m;
    }

    private Map<String, Object> readSystemCertInfo() {
        Map<String, Object> info = new LinkedHashMap<>();
        try {
            if (fabricConfig.getCertPath() == null) return info;
            Path certPath = Paths.get(fabricConfig.getCertPath());
            if (!Files.exists(certPath)) return info;

            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            X509Certificate cert;
            try (var is = Files.newInputStream(certPath)) {
                cert = (X509Certificate) cf.generateCertificate(is);
            }

            info.put("subject",   cert.getSubjectX500Principal().getName());
            info.put("issuer",    cert.getIssuerX500Principal().getName());
            info.put("serial",    cert.getSerialNumber().toString(16).toUpperCase());
            info.put("notBefore", cert.getNotBefore().toString());
            info.put("notAfter",  cert.getNotAfter().toString());
            info.put("algorithm", cert.getSigAlgName());
        } catch (Exception e) {
            log.warn("Could not read system cert info: {}", e.getMessage());
            info.put("error", "Certificate not readable");
        }
        return info;
    }

    private Map<String, Object> toAuditMap(CampaignAudit a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",               a.getId());
        m.put("campaignId",       a.getCampaign() != null ? a.getCampaign().getId() : null);
        m.put("campaignTitle",    a.getCampaign() != null ? a.getCampaign().getTitle() : "—");
        m.put("campaignStatus",   a.getCampaign() != null ? a.getCampaign().getStatus() : "—");
        m.put("conclusion",       a.getConclusion());
        m.put("evidenceSummary",  a.getEvidenceSummary());
        m.put("evidenceHash",     a.getEvidenceHash());
        m.put("notes",            a.getNotes());
        m.put("createdAt",        a.getCreatedAt() != null ? a.getCreatedAt().toString() : "");
        m.put("blockchainAuditId", a.getBlockchainAuditId());
        m.put("onChain",          a.getBlockchainAuditId() != null);
        return m;
    }
}
