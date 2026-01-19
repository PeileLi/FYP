package com.fyp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignResponse {
    private Long id;
    private String title;
    private String category;
    private String description;
    private BigDecimal goalAmount;
    private BigDecimal currentAmount;
    private String status;
    private String imageUrl;
    private String organizerName;
    private Long organizerId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Progress percentage
    public double getProgress() {
        if (goalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return 0;
        }
        return currentAmount.divide(goalAmount, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal(100))
                .doubleValue();
    }
}
