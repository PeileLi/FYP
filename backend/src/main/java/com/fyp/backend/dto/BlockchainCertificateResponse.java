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
    private String lastUpdated;
    private String deadline;
    private Double goalAmount;
    private String status;
    private String auditor;
    private Integer version;
    private String dataHash;
    private String blockchainTxId;

    // Database verification data
    private Long databaseId;
    private String databaseStatus;
    private String databaseCreatedAt;
    private String computedDataHash;

    // Verification status
    private boolean verified;
    private String verificationMessage;
}
