package com.fyp.backend.repository;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    long countByStatus(String status);
    long countByBlockchainTxIdIsNotNull();
    List<Campaign> findByStatus(String status);
    List<Campaign> findByCategoryAndStatus(String category, String status);
    Campaign findByBlockchainTxId(String blockchainTxId);
    List<Campaign> findByOrganizerOrderByCreatedAtDesc(User organizer);
    long countByOrganizer(User organizer);

    // Admin queries
    List<Campaign> findAllByOrderByCreatedAtDesc();
    List<Campaign> findByStatusOrderByCreatedAtDesc(String status);
    List<Campaign> findByAuditStatusOrderByCreatedAtDesc(String auditStatus);

    @Query("SELECT c FROM Campaign c WHERE " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:keyword IS NULL OR LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Campaign> searchAdmin(String status, String keyword);

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    @Query("SELECT c.status, COUNT(c) FROM Campaign c GROUP BY c.status")
    List<Object[]> countByStatusGroup();

    @Query("SELECT CAST(c.createdAt AS date), COUNT(c) FROM Campaign c WHERE c.createdAt >= :from GROUP BY CAST(c.createdAt AS date) ORDER BY CAST(c.createdAt AS date)")
    List<Object[]> dailyNewCampaignsSince(@Param("from") LocalDateTime from);

    List<Campaign> findTop5ByOrderByCreatedAtDesc();
}
