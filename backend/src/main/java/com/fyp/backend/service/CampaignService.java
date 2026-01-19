package com.fyp.backend.service;

import com.fyp.backend.dto.CampaignResponse;
import com.fyp.backend.dto.CreateCampaignRequest;
import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.CampaignRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;

    @Transactional
    public CampaignResponse createCampaign(CreateCampaignRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Campaign campaign = Campaign.builder()
                .title("Campaign #" + System.currentTimeMillis()) // Auto-generated title
                .category(request.getCategory())
                .description(request.getDescription())
                .goalAmount(request.getGoalAmount())
                .currentAmount(BigDecimal.ZERO)
                .status("ACTIVE") // Directly published
                .imageUrl(request.getImageUrl())
                .organizer(user)
                .build();

        Campaign savedCampaign = campaignRepository.save(campaign);
        return mapToResponse(savedCampaign);
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> getAllActiveCampaigns() {
        return campaignRepository.findByStatus("ACTIVE").stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> getAllCampaigns() {
        return campaignRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CampaignResponse getCampaignById(Long id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));
        return mapToResponse(campaign);
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> getCampaignsByCategory(String category) {
        return campaignRepository.findByCategoryAndStatus(category, "ACTIVE").stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateCampaignAmount(Long campaignId, BigDecimal donationAmount) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));

        BigDecimal newAmount = campaign.getCurrentAmount().add(donationAmount);
        campaign.setCurrentAmount(newAmount);

        // Check if goal reached
        if (newAmount.compareTo(campaign.getGoalAmount()) >= 0) {
            campaign.setStatus("COMPLETED");
        }

        campaignRepository.save(campaign);
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> getUserCampaigns(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return campaignRepository.findAll().stream()
                .filter(campaign -> campaign.getOrganizer().getId().equals(user.getId()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private CampaignResponse mapToResponse(Campaign campaign) {
        return CampaignResponse.builder()
                .id(campaign.getId())
                .title(campaign.getTitle())
                .category(campaign.getCategory())
                .description(campaign.getDescription())
                .goalAmount(campaign.getGoalAmount())
                .currentAmount(campaign.getCurrentAmount())
                .status(campaign.getStatus())
                .imageUrl(campaign.getImageUrl())
                .organizerName(campaign.getOrganizer().getDisplayName())
                .organizerId(campaign.getOrganizer().getId())
                .createdAt(campaign.getCreatedAt())
                .updatedAt(campaign.getUpdatedAt())
                .build();
    }
}
