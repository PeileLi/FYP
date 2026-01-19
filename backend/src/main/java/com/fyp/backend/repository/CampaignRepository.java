package com.fyp.backend.repository;

import com.fyp.backend.model.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    long countByStatus(String status);
    List<Campaign> findByStatus(String status);
    List<Campaign> findByCategoryAndStatus(String category, String status);
}
