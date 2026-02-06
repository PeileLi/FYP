package com.fyp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DonationResponse {
    private Long id;
    private Long campaignId;
    private String campaignTitle;
    private String donorName; // Real donor name (only visible to the donor themselves)
    private String displayName; // Public display name
    private Boolean isAnonymous; // Whether donation is anonymous
    private BigDecimal amount;
    private String message;
    private LocalDateTime date;
    private String status;
}

