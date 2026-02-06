package com.fyp.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Data Audit Log - Records all modifications to sensitive campaign data
 * 数据审计日志 - 记录所有对敏感活动数据的修改
 * 
 * Purpose: Detect tampering even if the data is changed back to original value
 * 目的：即使数据被改回原值也能检测到篡改
 */
@Entity
@Table(name = "data_audit_logs", indexes = {
    @Index(name = "idx_entity", columnList = "entityType,entityId"),
    @Index(name = "idx_modified_at", columnList = "modifiedAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataAuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // What was modified
    @Column(nullable = false)
    private String entityType;  // "CAMPAIGN", "DONATION"
    
    @Column(nullable = false)
    private Long entityId;  // Campaign ID or Donation ID
    
    @Column(nullable = false)
    private String fieldName;  // "currentAmount", "title", etc.
    
    // Change tracking
    @Column(columnDefinition = "TEXT")
    private String oldValue;
    
    @Column(columnDefinition = "TEXT")
    private String newValue;
    
    // When and who
    @Column(nullable = false)
    private LocalDateTime modifiedAt;
    
    @Column(nullable = true)
    private String modifiedBy;  // User email or "SYSTEM"
    
    @Column(nullable = true)
    private String modifiedSource;  // "APPLICATION", "DIRECT_DB", "MIGRATION"
    
    // Verification status at time of detection
    @Column(nullable = true)
    private String verificationStatus;  // "VERIFIED", "TAMPERED", "SUSPICIOUS"
    
    @Column(columnDefinition = "TEXT")
    private String notes;  // Additional context
}
