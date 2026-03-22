package com.fyp.backend.repository;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.Withdrawal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WithdrawalRepository extends JpaRepository<Withdrawal, Long> {
    List<Withdrawal> findByCampaignOrderByCreatedAtDesc(Campaign campaign);
}
