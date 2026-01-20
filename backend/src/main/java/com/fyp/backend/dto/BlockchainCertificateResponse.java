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
    private String campaignId;
    private String initiator;
    private String createdAt;
    private String status;
    private String description;
    private String auditor;
    private String blockchainTxId;
    
    // Database verification data
    private Long databaseId;
    private String databaseStatus;
    private String databaseCreatedAt;
    
    // Verification status
    private boolean verified;
    private String verificationMessage;
}
