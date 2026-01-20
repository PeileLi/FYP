package com.fyp.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String supabaseServiceKey;

    @Value("${supabase.storage.bucket-name:campaign-images}")
    private String bucketName;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Upload image to Supabase Storage
     * 
     * @param file MultipartFile to upload
     * @return Public URL of the uploaded file
     * @throws IOException if upload fails
     */
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
                return publicUrl;
            } else {
                throw new IOException("Failed to upload file to Supabase: " + response.getStatusCode());
            }

        } catch (Exception e) {
            throw new IOException("Failed to upload file to Supabase: " + e.getMessage(), e);
        }
    }

    /**
     * Delete image from Supabase Storage
     * 
     * @param filename Filename to delete
     * @return true if deleted successfully
     */
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
