package com.fyp.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * Supabase cloud implementation of ImageStorageService.
 * Uploads images to Supabase Storage via REST API.
 */
public class SupabaseStorageService implements ImageStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String supabaseServiceKey;

    @Value("${supabase.storage.bucket-name:campaign-images}")
    private String bucketName;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String uploadImage(MultipartFile file) throws IOException {
        // Validate file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }

        // Validate file size (5MB limit)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("File size must be less than 5MB");
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String fileExtension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String filename = UUID.randomUUID().toString() + fileExtension;

        // Prepare upload URL
        String uploadUrl = String.format("%s/storage/v1/object/%s/%s", 
                                         supabaseUrl, bucketName, filename);

        // Prepare headers
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseServiceKey);
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.set("x-upsert", "true"); // Allow overwrite if file exists

        // Create request entity
        HttpEntity<byte[]> requestEntity = new HttpEntity<>(file.getBytes(), headers);

        try {
            // Upload to Supabase
            ResponseEntity<String> response = restTemplate.exchange(
                uploadUrl,
                HttpMethod.POST,
                requestEntity,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                // Return public URL
                String publicUrl = String.format("%s/storage/v1/object/public/%s/%s", 
                                               supabaseUrl, bucketName, filename);
                System.out.println("Successfully uploaded file to Supabase: " + publicUrl);
                return publicUrl;
            } else {
                String errorMsg = String.format(
                    "Failed to upload file to Supabase. Status: %s, Response: %s", 
                    response.getStatusCode(), 
                    response.getBody()
                );
                System.err.println(errorMsg);
                throw new IOException(errorMsg);
            }

        } catch (Exception e) {
            String errorMsg = String.format(
                "Failed to upload file to Supabase. URL: %s, Bucket: %s, Filename: %s, Error: %s",
                supabaseUrl, bucketName, filename, e.getMessage()
            );
            System.err.println(errorMsg);
            
            // Check if it's a 403 error and provide specific guidance
            if (e.getMessage().contains("403") || e.getMessage().contains("Forbidden")) {
                System.err.println("⚠️  403 Error - This is likely a permissions issue:");
                System.err.println("   1. Check if bucket 'campaign-images' exists in Supabase Dashboard");
                System.err.println("   2. Verify Storage Policies are configured correctly");
                System.err.println("   3. Ensure SUPABASE_SERVICE_ROLE_KEY is correct (not anon key)");
                System.err.println("   4. See SUPABASE_STORAGE_FIX.md for detailed instructions");
            }
            
            throw new IOException(errorMsg, e);
        }
    }

    @Override
    public boolean deleteImage(String filename) {
        try {
            String deleteUrl = String.format("%s/storage/v1/object/%s/%s", 
                                           supabaseUrl, bucketName, filename);

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseServiceKey);

            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                deleteUrl,
                HttpMethod.DELETE,
                requestEntity,
                String.class
            );

            return response.getStatusCode().is2xxSuccessful();

        } catch (Exception e) {
            // Log error but don't throw
            System.err.println("Failed to delete file from Supabase: " + e.getMessage());
            return false;
        }
    }
}
