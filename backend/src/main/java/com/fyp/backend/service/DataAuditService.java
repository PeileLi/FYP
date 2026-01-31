package com.fyp.backend.service;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.DataAuditLog;
import com.fyp.backend.repository.DataAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Data Audit Service - Tracks all data modifications
 * 数据审计服务 - 追踪所有数据修改
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DataAuditService {

    private final DataAuditLogRepository auditLogRepository;

    /**
     * Record a data modification
     * 记录数据修改
     * Uses REQUIRES_NEW to create a new transaction, avoiding read-only transaction
     * issues
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public DataAuditLog recordModification(
            String entityType,
            Long entityId,
            String fieldName,
            String oldValue,
            String newValue,
            String modifiedBy,
            String modifiedSource,
            String verificationStatus) {
        // Skip if values are the same
        if (oldValue != null && oldValue.equals(newValue)) {
            return null;
        }

        // Skip if this exact tampering already exists (deduplication)
        // 如果这个篡改记录已存在，跳过（去重）
        if ("TAMPERED".equals(verificationStatus)) {
            boolean exists = auditLogRepository
                    .existsByEntityTypeAndEntityIdAndFieldNameAndOldValueAndNewValueAndVerificationStatus(
                            entityType, entityId, fieldName, oldValue, newValue, verificationStatus);
            if (exists) {
                log.debug("Tampering record already exists, skipping: {} #{} field '{}'",
                        entityType, entityId, fieldName);
                return null;
            }
        }

        DataAuditLog auditLog = DataAuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .fieldName(fieldName)
                .oldValue(oldValue)
                .newValue(newValue)
                .modifiedAt(LocalDateTime.now())
                .modifiedBy(modifiedBy)
                .modifiedSource(modifiedSource)
                .verificationStatus(verificationStatus)
                .build();

        DataAuditLog savedLog = auditLogRepository.save(auditLog);

        // Log warning if tampering detected
        if ("TAMPERED".equals(verificationStatus)) {
            log.warn("⚠️ TAMPERING DETECTED: {} #{} field '{}' changed from '{}' to '{}' by {}",
                    entityType, entityId, fieldName, oldValue, newValue, modifiedBy);
        }

        return savedLog;
    }

    /**
     * Record tampering detection
     * 记录篡改检测
     * Uses REQUIRES_NEW to create a new transaction, avoiding read-only transaction
     * issues
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void recordTampering(Campaign campaign, String fieldName, String dbValue, String blockchainValue) {
        recordModification(
                "CAMPAIGN",
                campaign.getId(),
                fieldName,
                blockchainValue, // Blockchain is the source of truth
                dbValue, // Database has been tampered
                "UNKNOWN",
                "DIRECT_DB",
                "TAMPERED");
    }

    /**
     * Get audit history for a campaign
     * 获取活动的审计历史
     */
    public List<DataAuditLog> getCampaignAuditHistory(Long campaignId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByModifiedAtDesc("CAMPAIGN", campaignId);
    }

    /**
     * Get all tampering incidents
     * 获取所有篡改事件
     */
    public List<DataAuditLog> getAllTamperingIncidents() {
        return auditLogRepository.findByVerificationStatusOrderByModifiedAtDesc("TAMPERED");
    }

    /**
     * Check if a campaign has tampering history
     * 检查活动是否有篡改历史
     */
    public boolean hasTamperingHistory(Long campaignId) {
        long count = auditLogRepository.countByEntityTypeAndEntityIdAndVerificationStatus(
                "CAMPAIGN", campaignId, "TAMPERED");
        return count > 0;
    }

    /**
     * Get recent tampering incidents (last 24 hours)
     * 获取最近的篡改事件（最近24小时）
     */
    public List<DataAuditLog> getRecentTamperingIncidents() {
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        return auditLogRepository.findByModifiedAtAfterOrderByModifiedAtDesc(since)
                .stream()
                .filter(log -> "TAMPERED".equals(log.getVerificationStatus()))
                .toList();
    }
}
