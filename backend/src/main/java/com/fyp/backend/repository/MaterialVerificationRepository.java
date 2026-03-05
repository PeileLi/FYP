package com.fyp.backend.repository;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.MaterialVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaterialVerificationRepository extends JpaRepository<MaterialVerification, Long> {
    List<MaterialVerification> findByCampaignOrderByCreatedAtDesc(Campaign campaign);
    Optional<MaterialVerification> findTopByCampaignOrderByCreatedAtDesc(Campaign campaign);
}
