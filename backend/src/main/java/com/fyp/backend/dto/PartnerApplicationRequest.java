package com.fyp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PartnerApplicationRequest {

    @NotBlank
    private String organizationName;

    @NotBlank
    private String email;

    @NotBlank
    private String description;
}
