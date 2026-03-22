package com.fyp.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "withdrawals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Withdrawal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String status; // PENDING_EVIDENCE, SUBMITTED, VERIFIED

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String evidenceUrls; // JSON array of file URLs

    @Column
    private String blockchainTxId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "PENDING_EVIDENCE";
    }
}
