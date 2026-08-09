package com.aiexception.explainer.service;

/**
 * Raised when an uploaded file type is not in the allowed extension allowlist.
 */
public class UnsupportedFileTypeException extends AiAnalysisException {

    public UnsupportedFileTypeException(String message) {
        super(message);
    }
}
