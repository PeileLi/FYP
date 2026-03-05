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
    private LocalDateTime completedAt; // Optional: set when campaign completes or is interrupted
    private String blockchainTxId; // Blockchain transaction ID for verification
    
    // Data integrity verification
    private Boolean dataVerified;  // true if matches blockchain, false if tampered, null if not verified
    private String verificationStatus; // "VERIFIED", "TAMPERED", "NOT_RECORDED", "VERIFICATION_FAILED"
    
    // Blockchain verification details (显示链上真实数据)
    private BigDecimal blockchainAmount;  // Real amount from blockchain (区块链真实金额)
    private Integer blockchainDonationCount;  // Real donation count from blockchain (区块链真实捐款次数)
    
    // Audit trail (审计追踪)
    private Boolean hasTamperingHistory;  // true if tampering was detected in the past (曾经被篡改过)
    private Integer tamperingIncidentCount;  // Number of tampering incidents (篡改次数)

    // Third-party partner audit
    private String auditStatus;
    private Boolean partnerEndorsed;
    private String partnerNote;
    private String endorsedBy;
    private LocalDateTime endorsedAt;
    
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
