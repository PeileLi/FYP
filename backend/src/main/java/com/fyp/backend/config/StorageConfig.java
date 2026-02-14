package com.fyp.backend.config;

import com.fyp.backend.service.ImageStorageService;
import com.fyp.backend.service.LocalStorageService;
import com.fyp.backend.service.SupabaseStorageService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration to select the image storage backend.
 *
 * When supabase.storage.enabled=true  -> SupabaseStorageService (cloud storage)
 * When supabase.storage.enabled=false -> LocalStorageService (local filesystem)
 *
 * Current default is true (Supabase). Set to false to use local storage
 * without any Supabase configuration.
 */
@Configuration
public class StorageConfig {

    @Bean
    @ConditionalOnProperty(name = "supabase.storage.enabled", havingValue = "true")
    public ImageStorageService supabaseStorageService() {
        System.out.println("Using Supabase Storage for image uploads");
        return new SupabaseStorageService();
    }

    @Bean
    @ConditionalOnProperty(name = "supabase.storage.enabled", havingValue = "false", matchIfMissing = true)
    public ImageStorageService localStorageService() {
        System.out.println("Using Local Storage for image uploads");
        return new LocalStorageService();
    }
}
