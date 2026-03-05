package com.fyp.backend.repository;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.CampaignUpdate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CampaignUpdateRepository extends JpaRepository<CampaignUpdate, Long> {
    List<CampaignUpdate> findByCampaignOrderByCreatedAtDesc(Campaign campaign);
}
