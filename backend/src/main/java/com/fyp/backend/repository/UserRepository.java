package com.fyp.backend.repository;

import com.fyp.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    List<User> findAllByOrderByCreatedAtDesc();

    boolean existsByUsername(String username);

    boolean existsByDisplayName(String displayName);

    long countByEnabled(boolean enabled);

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    @Query("SELECT u.role, COUNT(u) FROM User u GROUP BY u.role")
    List<Object[]> countByRole();

    @Query("SELECT CAST(u.createdAt AS date), COUNT(u) FROM User u WHERE u.createdAt >= :from GROUP BY CAST(u.createdAt AS date) ORDER BY CAST(u.createdAt AS date)")
    List<Object[]> dailyNewUsersSince(@Param("from") LocalDateTime from);
}
