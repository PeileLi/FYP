package com.fyp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCampaignRequest {
    private String title;
    private String category;
    private String description;
    private BigDecimal goalAmount;
    private String imageUrl;
    private List<DocumentItem> documents;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentItem {
        private String name;
        private String url;
        private String docType;
        private boolean isImage;
    }
}
