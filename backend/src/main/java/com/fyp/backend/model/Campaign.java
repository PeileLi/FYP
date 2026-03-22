package com.fyp.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "campaigns")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Campaign {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private BigDecimal goalAmount;

    @Column(nullable = false)
    private BigDecimal currentAmount;

    @Column(nullable = false)
    private String status; // PENDING, ACTIVE, SUSPENDED, COMPLETED, CLOSED, FROZEN

    @Column
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id")
    private User organizer;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Optional: Set when campaign reaches goal or is interrupted/closed
    @Column(nullable = true)
    private LocalDateTime completedAt;

    // Blockchain transaction ID for tracking on-chain data (certificate ID like
    // BCxxx)
    @Column(nullable = true)
    private String blockchainTxId;

    // The actual campaign ID used on the blockchain ledger (independent of database
    // auto-increment ID)
    // This ensures DB ID changes (reset, migration) don't break the blockchain link
    @Column(nullable = true)
    private String blockchainCampaignId;

    // Third-party partner audit
    // auditStatus: PENDING_AUDIT, UNDER_REVIEW, APPROVED, REJECTED, REQUIRES_INFO, RISK_FLAGGED
    @Column(nullable = false)
    @Builder.Default
    private String auditStatus = "PENDING_AUDIT";

    // Keep simple endorsement for display (set by service when APPROVED)
    @Column(nullable = false)
    @Builder.Default
    private Boolean partnerEndorsed = false;

    @Column(columnDefinition = "TEXT")
    private String partnerNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "endorsed_by_id")
    private User endorsedBy;

    @Column(nullable = true)
    private LocalDateTime endorsedAt;

    @Column(columnDefinition = "TEXT")
    private String fundUsagePlan;

    @Column(columnDefinition = "TEXT")
    private String freezeReason;

    @Builder.Default
    private Boolean unfreezeRequested = false;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (currentAmount == null)
            currentAmount = BigDecimal.ZERO;
        if (status == null)
            status = "PENDING";
        if (title == null || title.equals("Pending Review"))
            title = "Campaign #" + System.currentTimeMillis(); // Auto-generated title
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
