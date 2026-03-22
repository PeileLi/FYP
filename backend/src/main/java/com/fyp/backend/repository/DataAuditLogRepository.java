package com.fyp.backend.repository;

import com.fyp.backend.model.DataAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DataAuditLogRepository extends JpaRepository<DataAuditLog, Long> {
    
    /**
     * Find all audit logs for a specific entity
     */
    List<DataAuditLog> findByEntityTypeAndEntityIdOrderByModifiedAtDesc(String entityType, Long entityId);
    
    /**
     * Find suspicious modifications (tampering detected)
     */
    List<DataAuditLog> findByVerificationStatusOrderByModifiedAtDesc(String verificationStatus);
    
    /**
     * Find recent modifications
     */
    List<DataAuditLog> findByModifiedAtAfterOrderByModifiedAtDesc(LocalDateTime since);
    
    /**
     * Count tampering incidents for a campaign
     */
    long countByEntityTypeAndEntityIdAndVerificationStatus(
        String entityType, Long entityId, String verificationStatus);
    
    /**
     * Check if a specific tampering already exists
     * 检查特定的篡改记录是否已存在（去重）
     */
    boolean existsByEntityTypeAndEntityIdAndFieldNameAndOldValueAndNewValueAndVerificationStatus(
        String entityType, Long entityId, String fieldName, 
        String oldValue, String newValue, String verificationStatus);
}
