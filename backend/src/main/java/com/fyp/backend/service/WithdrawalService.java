package com.fyp.backend.service;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.User;
import com.fyp.backend.model.Withdrawal;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.UserRepository;
import com.fyp.backend.repository.WithdrawalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalService {

    private final WithdrawalRepository withdrawalRepository;
    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;
    private final CampaignService campaignService;
    private final FabricGatewayService fabricGatewayService;

    @Transactional
    public Map<String, Object> requestWithdrawal(Long campaignId, BigDecimal amount, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));

        if (!campaign.getOrganizer().getId().equals(user.getId())) {
            throw new SecurityException("Only the campaign organizer can request a withdrawal");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Invalid withdrawal amount");
        }
        if (amount.compareTo(campaign.getCurrentAmount()) > 0) {
            throw new RuntimeException("Withdrawal amount exceeds available funds");
        }

        Withdrawal withdrawal = Withdrawal.builder()
                .campaign(campaign)
                .amount(amount)
                .status("PENDING_EVIDENCE")
                .build();
        withdrawalRepository.save(withdrawal);

        log.info("Withdrawal #{} requested for campaign {} — amount: {}", withdrawal.getId(), campaignId, amount);
        return toMap(withdrawal);
    }

    @Transactional
    public Map<String, Object> submitEvidence(Long withdrawalId, String evidenceUrls, String description, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Withdrawal withdrawal = withdrawalRepository.findById(withdrawalId)
                .orElseThrow(() -> new RuntimeException("Withdrawal not found"));

        if (!withdrawal.getCampaign().getOrganizer().getId().equals(user.getId())) {
            throw new SecurityException("Only the campaign organizer can submit evidence");
        }
        if (!"PENDING_EVIDENCE".equals(withdrawal.getStatus())) {
            throw new RuntimeException("Evidence has already been submitted");
        }

        withdrawal.setEvidenceUrls(evidenceUrls);
        withdrawal.setDescription(description);
        withdrawal.setStatus("SUBMITTED");
        withdrawal.setSubmittedAt(LocalDateTime.now());

        Campaign campaign = withdrawal.getCampaign();
        try {
            String chainId = campaignService.ensureBlockchainRecord(campaign);
            if (chainId != null && fabricGatewayService.isEnabled()) {
                String evidenceHash = CampaignService.sha256Hex(
                        (evidenceUrls != null ? evidenceUrls : "") + "|" + (description != null ? description : ""));
                String timestamp = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                String txId = fabricGatewayService.recordDisbursement(
                        chainId, withdrawal.getAmount().doubleValue(),
                        CampaignService.sha256Hex(user.getUsername()),
                        evidenceHash, timestamp);
                withdrawal.setBlockchainTxId(txId);
            }
        } catch (Exception e) {
            log.warn("Failed to record disbursement on blockchain: {}", e.getMessage());
        }

        withdrawalRepository.save(withdrawal);
        log.info("Evidence submitted for withdrawal #{}", withdrawalId);
        return toMap(withdrawal);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCampaignWithdrawals(Long campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));
        return withdrawalRepository.findByCampaignOrderByCreatedAtDesc(campaign)
                .stream().map(this::toMap).toList();
    }

    private Map<String, Object> toMap(Withdrawal w) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", w.getId());
        m.put("campaignId", w.getCampaign().getId());
        m.put("amount", w.getAmount());
        m.put("status", w.getStatus());
        m.put("description", w.getDescription());
        m.put("evidenceUrls", w.getEvidenceUrls());
        m.put("blockchainTxId", w.getBlockchainTxId());
        m.put("createdAt", w.getCreatedAt() != null ? w.getCreatedAt().toString() : "");
        m.put("submittedAt", w.getSubmittedAt() != null ? w.getSubmittedAt().toString() : null);
        return m;
    }
}
