package com.fyp.backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Local filesystem implementation of ImageStorageService.
 * Stores images to a local directory and serves them via /api/files/images/{filename}.
 */
public class LocalStorageService implements ImageStorageService {

    @Value("${file.upload-dir:uploads/images}")
    private String uploadDir;

    private Path uploadPath;

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
            System.out.println("Local storage initialized at: " + uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + uploadPath, e);
        }
    }

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

        // Save file to local filesystem
        Path targetLocation = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        // Return URL path that will be served by FileServingController
        String fileUrl = "/api/files/images/" + filename;
        System.out.println("Successfully saved file locally: " + fileUrl);
        return fileUrl;
    }

    @Override
    public boolean deleteImage(String filename) {
        try {
            // Extract filename from URL path if needed
            if (filename.contains("/")) {
                filename = filename.substring(filename.lastIndexOf("/") + 1);
            }
            Path filePath = uploadPath.resolve(filename).normalize();
            return Files.deleteIfExists(filePath);
        } catch (IOException e) {
            System.err.println("Failed to delete local file: " + e.getMessage());
            return false;
        }
    }

    @Override
    public Resource loadImage(String filename) {
        try {
            Path filePath = uploadPath.resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                System.err.println("File not found or not readable: " + filename);
                return null;
            }
        } catch (MalformedURLException e) {
            System.err.println("Failed to load file: " + e.getMessage());
            return null;
        }
    }
}
