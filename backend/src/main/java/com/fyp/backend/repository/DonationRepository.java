package com.fyp.backend.repository;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.Donation;
import com.fyp.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface DonationRepository extends JpaRepository<Donation, Long> {
    List<Donation> findByUserOrderByDonationDateDesc(User user);
    List<Donation> findByCampaignOrderByDonationDateDesc(Campaign campaign);

    List<Donation> findTop20ByOrderByDonationDateDesc();

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM Donation d")
    BigDecimal getTotalDonationAmount();

    @Query("SELECT COUNT(DISTINCT d.user.id) FROM Donation d")
    long countDistinctDonors();
}
