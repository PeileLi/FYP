package com.fyp.backend.controller;

import com.fyp.backend.service.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class FileUploadController {

    private final ImageStorageService imageStorageService;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain"
    );

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @PostMapping("/image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        return doUpload(file, true);
    }

    @PostMapping("/file")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        return doUpload(file, false);
    }

    private ResponseEntity<?> doUpload(MultipartFile file, boolean imageOnly) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Please select a file to upload"));
            }

            String contentType = file.getContentType();
            boolean isImage = contentType != null && contentType.startsWith("image/");

            if (imageOnly) {
                if (!isImage) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Only image files are allowed"));
                }
            } else {
                if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
                    return ResponseEntity.badRequest().body(Map.of("error",
                            "Unsupported file type. Allowed: images, PDF, Word, Excel, text"));
                }
            }

            if (file.getSize() > MAX_FILE_SIZE) {
                return ResponseEntity.badRequest().body(Map.of("error", "File size must be less than 10MB"));
            }

            String fileUrl = imageStorageService.uploadImage(file);
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";

            return ResponseEntity.ok(Map.of(
                    "url", fileUrl,
                    "fileName", originalName,
                    "contentType", contentType != null ? contentType : "",
                    "isImage", isImage,
                    "message", "File uploaded successfully"
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload file: " + e.getMessage()));
        }
    }
}
