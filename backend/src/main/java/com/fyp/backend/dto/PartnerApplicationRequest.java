package com.fyp.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PartnerApplicationRequest {

    @NotBlank
    private String organizationName;

    @NotBlank
    @Email
    private String email;

    private String phone;

    @NotBlank
    private String description;
}
