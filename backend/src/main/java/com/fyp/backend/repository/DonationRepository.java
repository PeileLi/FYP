package com.fyp.backend.repository;

import com.fyp.backend.model.Donation;
import com.fyp.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DonationRepository extends JpaRepository<Donation, Long> {
    List<Donation> findByUserOrderByDonationDateDesc(User user);
}
