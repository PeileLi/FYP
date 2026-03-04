package com.fyp.backend.service;

import com.fyp.backend.dto.CreateDonationRequest;
import com.fyp.backend.dto.DonationResponse;
import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.Donation;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.DonationRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DonationService {
    private final DonationRepository donationRepository;
    private final UserRepository userRepository;
    private final CampaignRepository campaignRepository;
    private final CampaignService campaignService;
    private final FabricGatewayService fabricGatewayService;

    @Transactional
    public DonationResponse createDonation(CreateDonationRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Campaign campaign = campaignRepository.findById(request.getCampaignId())
                .orElseThrow(() -> new RuntimeException("Campaign not found"));

        // Validate campaign is active
        if (!"ACTIVE".equals(campaign.getStatus())) {
            throw new RuntimeException("Campaign is not active");
        }

        // Validate amount
        if (request.getAmount() == null || request.getAmount().doubleValue() <= 0) {
            throw new RuntimeException("Invalid donation amount");
        }

        // Determine display name based on display type
        String displayName;
        boolean isAnonymous = false;
        
        String displayType = request.getDisplayType() != null ? request.getDisplayType() : "default";
        
        switch (displayType) {
            case "custom":
                // Use custom display name provided by user
                displayName = request.getCustomDisplayName() != null && !request.getCustomDisplayName().trim().isEmpty()
                        ? request.getCustomDisplayName().trim()
                        : user.getDisplayName(); // Fallback to default if custom name is empty
                break;
            case "anonymous":
                // Anonymous donation
                displayName = "Anonymous";
                isAnonymous = true;
                break;
            case "default":
            default:
                // Use user's display name
                displayName = user.getDisplayName();
                break;
        }

        // Create donation with a temporary transaction hash
        // Will be updated after blockchain recording
        String tempTxHash = "TX_" + System.currentTimeMillis();
        
        Donation donation = Donation.builder()
                .user(user)
                .campaign(campaign)
                .amount(request.getAmount())
                .message(request.getMessage())
                .displayName(displayName)
                .isAnonymous(isAnonymous)
                .status("COMPLETED")
                .transactionHash(tempTxHash)
                .build();

        Donation savedDonation = donationRepository.save(donation);

        // Create donation record on blockchain
        try {
            // Resolve the blockchain campaign ID (independent of DB auto-increment ID)
            String blockchainCampaignId = CampaignService.resolveBlockchainCampaignId(campaign);
            
            if (fabricGatewayService.isEnabled() && blockchainCampaignId != null) {
                String donationId = "DON_" + savedDonation.getId() + "_" + System.currentTimeMillis();
                String donorIdentifier = user.getEmail();
                
                fabricGatewayService.createDonation(
                    donationId,
                    blockchainCampaignId,
                    request.getAmount().doubleValue(),
                    donorIdentifier,
                    displayName,
                    isAnonymous
                );
                
                // Generate blockchain certificate ID (same style as campaign BC format)
                String timestamp = String.valueOf(System.currentTimeMillis());
                String compositeKey = donationId + "::" + timestamp;
                String certificateId = "BD" + bytesToHex(compositeKey.getBytes());
                
                savedDonation.setTransactionHash(certificateId);
                donationRepository.save(savedDonation);
                
                log.info("Donation {} recorded on blockchain for campaign {} (bcId={}, cert={})",
                        donationId, campaign.getId(), blockchainCampaignId, certificateId);
            } else {
                log.info("Blockchain skipped for donation {} (enabled={}, bcCampaignId={})",
                        savedDonation.getId(), fabricGatewayService.isEnabled(), blockchainCampaignId);
            }
        } catch (Exception e) {
            log.error("Failed to record donation on blockchain: {}", e.getMessage());
            // Keep the temporary transaction hash - donation is still valid in database
        }

        // Update campaign amount
        campaignService.updateCampaignAmount(campaign.getId(), request.getAmount());

        return mapToDonationResponse(savedDonation);
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> getUserDonations(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Donation> donations = donationRepository.findByUserOrderByDonationDateDesc(user);

        return donations.stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> getCampaignDonations(Long campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));

        List<Donation> donations = donationRepository.findByCampaignOrderByDonationDateDesc(campaign);

        return donations.stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());
    }

    private DonationResponse mapToDonationResponse(Donation donation) {
        // Hide real donor name for anonymous donations to protect privacy
        String donorName = Boolean.TRUE.equals(donation.getIsAnonymous()) 
                ? "Anonymous" 
                : donation.getUser().getDisplayName();
        
        return DonationResponse.builder()
                .id(donation.getId())
                .campaignId(donation.getCampaign().getId())
                .campaignTitle(donation.getCampaign().getTitle())
                .donorName(donorName)
                .displayName(Boolean.TRUE.equals(donation.getIsAnonymous()) ? "Anonymous" : donation.getDisplayName())
                .isAnonymous(donation.getIsAnonymous())
                .amount(donation.getAmount())
                .message(donation.getMessage())
                .date(donation.getDonationDate())
                .status(donation.getStatus())
                .transactionHash(donation.getTransactionHash())
                .build();
    }

    /**
     * Convert byte array to hex string (same as FabricGatewayService.bytesToHex)
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}

