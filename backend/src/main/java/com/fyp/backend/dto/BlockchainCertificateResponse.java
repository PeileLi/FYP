package com.fyp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlockchainCertificateResponse {
    // Immutable fields from blockchain (不可变字段)
    private String campaignId;
    private String title;
    private String category;
    private String description;
    private String initiator;
    private String createdAt;
    private Double goalAmount;
    private String auditor;
    private String dataHash;
    private Integer version;
    private String blockchainTxId;
    
    // Dynamic fields from blockchain (动态字段)
    private String status;
    private Double totalAmount;
    private Integer donationCount;
    
    // Database verification data
    private Long databaseId;
    private String databaseStatus;
    private String databaseCreatedAt;
    
    // Verification status
    private boolean verified;
    private String verificationMessage;
}
