package com.aiexception.explainer.service.extraction;

import com.aiexception.explainer.service.UnsupportedFileTypeException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Validates an uploaded file's extension against the allowlist and dispatches
 * to the appropriate extractor (PDF or text).
 */
@Service
public class FileExtractionService {

    private final Set<String> allowedExtensions;
    private final PdfFileExtractor pdfFileExtractor;
    private final TextFileExtractor textFileExtractor;

    public FileExtractionService(
            @Value("${app.allowed-file-extensions}") String allowedExtensions,
            PdfFileExtractor pdfFileExtractor,
            TextFileExtractor textFileExtractor) {
        this.allowedExtensions = Arrays.stream(allowedExtensions.split(","))
                .map(ext -> ext.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
        this.pdfFileExtractor = pdfFileExtractor;
        this.textFileExtractor = textFileExtractor;
    }

    public String extract(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new UnsupportedFileTypeException("No file was uploaded.");
        }

        String filename = file.getOriginalFilename();
        String extension = extensionOf(filename);

        if (!allowedExtensions.contains(extension)) {
            throw new UnsupportedFileTypeException(
                    "Unsupported file type: " + (extension.isEmpty() ? "(none)" : extension)
                            + ". Allowed: " + String.join(", ", allowedExtensions));
        }

        if (extension.equals(".pdf")) {
            return pdfFileExtractor.extract(file);
        }
        return textFileExtractor.extract(file);
    }

    private String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot).toLowerCase(Locale.ROOT);
    }
}
