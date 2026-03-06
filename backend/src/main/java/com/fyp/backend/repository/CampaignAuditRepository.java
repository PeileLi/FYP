package com.fyp.backend.repository;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.CampaignAudit;
import com.fyp.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CampaignAuditRepository extends JpaRepository<CampaignAudit, Long> {
    List<CampaignAudit> findByCampaignOrderByCreatedAtDesc(Campaign campaign);
    Optional<CampaignAudit> findTopByCampaignOrderByCreatedAtDesc(Campaign campaign);
    List<CampaignAudit> findByAuditorOrderByCreatedAtDesc(User auditor);
    long countByAuditor(User auditor);
}
