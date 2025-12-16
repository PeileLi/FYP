package com.fyp.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "jwt")
@Data
public class JwtProperties {
    private String secret = "your-secret-key-change-this-in-production-use-a-long-random-string-at-least-256-bits-required-for-security";
    private Long expiration = 86400000L; // 24 hours in milliseconds
}
