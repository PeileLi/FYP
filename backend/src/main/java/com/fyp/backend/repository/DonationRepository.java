package com.fyp.backend.repository;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.Donation;
import com.fyp.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DonationRepository extends JpaRepository<Donation, Long> {
    List<Donation> findByUserOrderByDonationDateDesc(User user);
    List<Donation> findByCampaignOrderByDonationDateDesc(Campaign campaign);
    long countByCampaignId(Long campaignId);

    List<Donation> findTop20ByOrderByDonationDateDesc();
    long countByTransactionHashIsNotNull();
    long countByUser(User user);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM Donation d")
    BigDecimal getTotalDonationAmount();

    @Query("SELECT COUNT(DISTINCT d.user.id) FROM Donation d")
    long countDistinctDonors();

    // Admin queries
    List<Donation> findAllByOrderByDonationDateDesc();

    @Query("SELECT d FROM Donation d WHERE " +
           "(:campaignId IS NULL OR d.campaign.id = :campaignId) AND " +
           "(:status IS NULL OR d.status = :status) AND " +
           "(:from IS NULL OR d.donationDate >= :from) AND " +
           "(:to IS NULL OR d.donationDate <= :to) " +
           "ORDER BY d.donationDate DESC")
    List<Donation> searchAdmin(@Param("campaignId") Long campaignId,
                               @Param("status") String status,
                               @Param("from") LocalDateTime from,
                               @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM Donation d WHERE d.donationDate >= :from")
    BigDecimal sumAmountSince(@Param("from") LocalDateTime from);

    long countByDonationDateBetween(LocalDateTime from, LocalDateTime to);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM Donation d WHERE d.donationDate BETWEEN :from AND :to")
    BigDecimal sumAmountBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    List<Donation> findTop5ByOrderByDonationDateDesc();

    @Query("SELECT d.campaign.category, COALESCE(SUM(d.amount), 0) FROM Donation d GROUP BY d.campaign.category")
    List<Object[]> sumByCampaignCategory();

    @Query("SELECT CAST(d.donationDate AS date), COUNT(d), COALESCE(SUM(d.amount), 0) " +
           "FROM Donation d WHERE d.donationDate >= :from GROUP BY CAST(d.donationDate AS date) " +
           "ORDER BY CAST(d.donationDate AS date)")
    List<Object[]> dailyStatsSince(@Param("from") LocalDateTime from);
}
