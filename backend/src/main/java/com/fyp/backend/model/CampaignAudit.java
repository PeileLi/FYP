package com.fyp.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "campaign_audits")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auditor_id", nullable = false)
    private User auditor;

    @Column(nullable = false)
    private String conclusion; // APPROVED | REJECTED | REQUIRES_INFO | RISK_FLAGGED

    @Column(columnDefinition = "TEXT")
    private String evidenceSummary;

    @Column
    private String evidenceHash;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column
    private String blockchainAuditId; // Audit ID returned from chaincode

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
