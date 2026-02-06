package com.fyp.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "donations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Donation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(columnDefinition = "TEXT")
    private String message; // Optional donation message

    @Column
    private String displayName; // Public display name (user input or default)

    @Column(nullable = false)
    @Builder.Default
    private Boolean isAnonymous = false; // Whether donation is anonymous

    @Column(nullable = false)
    private LocalDateTime donationDate;

    @Column(nullable = false)
    private String status; // COMPLETED, PENDING, FAILED

    @PrePersist
    protected void onCreate() {
        donationDate = LocalDateTime.now();
        if (status == null) {
            status = "COMPLETED";
        }
    }
}
