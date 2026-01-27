package com.fyp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDonationRequest {
    private Long campaignId;
    private BigDecimal amount;
    private String message; // Optional donation message
    
    // Display options: "default" (use user's display name), "custom" (use custom name), "anonymous"
    private String displayType; // default, custom, anonymous
    private String customDisplayName; // Used when displayType is "custom"
}
