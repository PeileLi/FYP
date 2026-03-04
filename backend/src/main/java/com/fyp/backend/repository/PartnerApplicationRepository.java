package com.fyp.backend.repository;

import com.fyp.backend.model.PartnerApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PartnerApplicationRepository extends JpaRepository<PartnerApplication, Long> {
    boolean existsByEmail(String email);
    Optional<PartnerApplication> findByEmail(String email);
    List<PartnerApplication> findAllByOrderByCreatedAtDesc();
    List<PartnerApplication> findByStatusOrderByCreatedAtDesc(PartnerApplication.Status status);
}
