package com.aiexception.explainer.service.extraction;

import com.aiexception.explainer.service.FileExtractionException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Reads UTF-8 text files, capped at the same size limit as the analyze request.
 */
@Component
public class TextFileExtractor implements FileContentExtractor {

    private static final int MAX_CONTENT_CHARS = 20000;

    @Override
    public String extract(MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new FileExtractionException("Could not read the uploaded file.", e);
        }

        if (containsNullByte(bytes)) {
            throw new FileExtractionException("This file appears to be binary. Upload a text file or PDF instead.");
        }

        String text = new String(bytes, StandardCharsets.UTF_8);
        if (text.isBlank()) {
            throw new FileExtractionException("The uploaded file contains no readable text.");
        }
        if (text.length() > MAX_CONTENT_CHARS) {
            text = text.substring(0, MAX_CONTENT_CHARS);
        }
        return text;
    }

    private boolean containsNullByte(byte[] bytes) {
        for (byte b : bytes) {
            if (b == 0) {
                return true;
            }
        }
        return false;
    }
}
