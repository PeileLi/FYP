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
    private String status; // ACTIVE, COMPLETED (goal reached), CLOSED (manually closed/interrupted)

    @Column(nullable = false)
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

    // Blockchain transaction ID for tracking on-chain data
    @Column(nullable = true)
    private String blockchainTxId;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (currentAmount == null)
            currentAmount = BigDecimal.ZERO;
        if (status == null)
            status = "ACTIVE"; // Directly published
        if (title == null || title.equals("Pending Review"))
            title = "Campaign #" + System.currentTimeMillis(); // Auto-generated title
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
