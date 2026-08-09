package com.aiexception.explainer.service.extraction;

import org.springframework.web.multipart.MultipartFile;

/**
 * Extracts text content from an uploaded file.
 */
public interface FileContentExtractor {

    String extract(MultipartFile file);
}
