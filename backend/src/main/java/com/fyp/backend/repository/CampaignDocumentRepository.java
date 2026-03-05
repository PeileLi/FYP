package com.fyp.backend.repository;

import com.fyp.backend.model.Campaign;
import com.fyp.backend.model.CampaignDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CampaignDocumentRepository extends JpaRepository<CampaignDocument, Long> {
    List<CampaignDocument> findByCampaignOrderByUploadedAtDesc(Campaign campaign);
}
