package com.fyp.backend.service;

import com.fyp.backend.dto.DonationResponse;
import com.fyp.backend.model.Donation;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.DonationRepository;
import com.fyp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DonationService {
    private final DonationRepository donationRepository;
    private final UserRepository userRepository;

    public List<DonationResponse> getUserDonations(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Donation> donations = donationRepository.findByUserOrderByDonationDateDesc(user);

        return donations.stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());
    }

    private DonationResponse mapToDonationResponse(Donation donation) {
        return DonationResponse.builder()
                .id(donation.getId())
                .campaignTitle(donation.getCampaign().getTitle())
                .amount(donation.getAmount())
                .date(donation.getDonationDate())
                .status(donation.getStatus())
                .transactionHash(donation.getTransactionHash())
                .build();
    }
}

