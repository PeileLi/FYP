package com.fyp.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Records a partner's material-verification checklist for a campaign.
 * The checklist is stored as a JSON string (list of CheckItem).
 * overall_status: PASS | PARTIAL | FAIL
 */
@Entity
@Table(name = "material_verifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private User partner;

    /** JSON array of CheckItem objects. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String checklist;

    @Column(columnDefinition = "TEXT")
    private String overallNote;

    @Column(nullable = false, length = 16)
    @Builder.Default
    private String overallStatus = "PARTIAL"; // PASS | PARTIAL | FAIL

    @Column
    private String blockchainVerificationId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
