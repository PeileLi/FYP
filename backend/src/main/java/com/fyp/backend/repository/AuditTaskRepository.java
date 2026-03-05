package com.fyp.backend.repository;

import com.fyp.backend.model.AuditTask;
import com.fyp.backend.model.AuditTask.Status;
import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuditTaskRepository extends JpaRepository<AuditTask, Long> {

    Optional<AuditTask> findByCampaign(Campaign campaign);

    List<AuditTask> findByStatusOrderByCreatedAtAsc(Status status);

    List<AuditTask> findByAssignedPartnerAndStatusOrderByUpdatedAtDesc(User partner, Status status);

    @Query("SELECT t FROM AuditTask t WHERE t.assignedPartner = :partner ORDER BY t.updatedAt DESC")
    List<AuditTask> findByAssignedPartner(User partner);

    boolean existsByCampaign(Campaign campaign);
}
