package com.fyp.backend.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Abstraction for image storage.
 * Implementations: SupabaseStorageService (cloud) and LocalStorageService (local filesystem).
 */
public interface ImageStorageService {

    /**
     * Upload an image file and return the accessible URL.
     *
     * @param file the image file to upload
     * @return the public URL of the uploaded image
     * @throws IOException if the upload fails
     */
    String uploadImage(MultipartFile file) throws IOException;

    /**
     * Delete an image by its filename.
     *
     * @param filename the filename to delete
     * @return true if deleted successfully
     */
    boolean deleteImage(String filename);

    /**
     * Load an image as a Resource (for local serving).
     * Cloud implementations may return null or throw UnsupportedOperationException.
     *
     * @param filename the filename to load
     * @return the Resource, or null if not supported
     */
    default Resource loadImage(String filename) {
        return null;
    }
}
