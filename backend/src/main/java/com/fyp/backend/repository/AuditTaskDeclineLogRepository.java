package com.fyp.backend.repository;

import com.fyp.backend.model.AuditTask;
import com.fyp.backend.model.AuditTaskDeclineLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditTaskDeclineLogRepository extends JpaRepository<AuditTaskDeclineLog, Long> {
    List<AuditTaskDeclineLog> findByTaskOrderByCreatedAtDesc(AuditTask task);
}
