package com.fyp.backend.controller;

import com.fyp.backend.service.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Controller to serve locally stored images.
 * Only used when local storage is active (supabase.storage.enabled=false).
 * When Supabase storage is used, images are served directly from Supabase CDN.
 */
@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class FileServingController {

    private final ImageStorageService imageStorageService;

    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<Resource> serveImage(@PathVariable String filename) {
        Resource resource = imageStorageService.loadImage(filename);

        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        // Determine content type
        String contentType = "application/octet-stream";
        try {
            Path path = resource.getFile().toPath();
            String detectedType = Files.probeContentType(path);
            if (detectedType != null) {
                contentType = detectedType;
            }
        } catch (IOException e) {
            // Use default content type
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(resource);
    }
}
