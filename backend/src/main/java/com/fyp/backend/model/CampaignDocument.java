package com.fyp.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "campaign_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignDocument {

    /** Document category — used as display label in the partner review panel. */
    public enum DocType {
        IDENTITY,       // Organiser ID / passport
        REGISTRATION,   // Organisation registration cert
        BANK,           // Bank account evidence
        PLAN,           // Fund-usage plan document
        PHOTO,          // Photo / image evidence
        LINK,           // External URL reference
        OTHER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private DocType docType = DocType.OTHER;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String url;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }
}
