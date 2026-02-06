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
                displayName = "匿名";
                isAnonymous = true;
                break;
            case "default":
            default:
                // Use user's display name
                displayName = user.getDisplayName();
                break;
        }

        // Create donation
        Donation donation = Donation.builder()
                .user(user)
                .campaign(campaign)
                .amount(request.getAmount())
                .message(request.getMessage())
                .displayName(displayName)
                .isAnonymous(isAnonymous)
                .status("COMPLETED")
                .build();

        Donation savedDonation = donationRepository.save(donation);

        // Create donation record on blockchain
        try {
            String donationId = "DON" + savedDonation.getId();
            String campaignId = "CAMP" + campaign.getId();
            String donorIdentifier = user.getEmail(); // Real identifier stored on blockchain
            
            fabricGatewayService.createDonation(
                donationId,
                campaignId,
                request.getAmount().doubleValue(),
                donorIdentifier,
                displayName,
                isAnonymous
            );
            
            log.info("Donation {} recorded on blockchain", donationId);
        } catch (Exception e) {
            log.error("Failed to record donation on blockchain: {}", e.getMessage());
            // Continue even if blockchain fails
        }

        // Update campaign amount
        campaignService.updateCampaignAmount(campaign.getId(), request.getAmount());

        return mapToDonationResponse(savedDonation);
    }

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
        return DonationResponse.builder()
                .id(donation.getId())
                .campaignId(donation.getCampaign().getId())
                .campaignTitle(donation.getCampaign().getTitle())
                .donorName(donation.getUser().getDisplayName())
                .displayName(donation.getDisplayName())
                .isAnonymous(donation.getIsAnonymous())
                .amount(donation.getAmount())
                .message(donation.getMessage())
                .date(donation.getDonationDate())
                .status(donation.getStatus())
                .build();
    }
}

