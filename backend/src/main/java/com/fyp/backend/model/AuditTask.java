package com.fyp.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditTask {

    public enum Status { OPEN, ACCEPTED, COMPLETED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false, unique = true)
    private Campaign campaign;

    /** Null until a partner accepts the task. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_partner_id")
    private User assignedPartner;

    @Version
    private Long version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private Status status = Status.OPEN;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
