package com.aiexception.explainer.service;

/**
 * Raised when file content cannot be extracted (binary, empty, or unreadable).
 */
public class FileExtractionException extends AiAnalysisException {

    public FileExtractionException(String message) {
        super(message);
    }

    public FileExtractionException(String message, Throwable cause) {
        super(message, cause);
    }
}
