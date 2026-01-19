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
    private String donorName;
    private BigDecimal amount;
    private String message;
    private LocalDateTime date;
    private String status;
}

