package com.aiexception.explainer.service;

/**
 * Base exception for AI analysis failures.
 */
public class AiAnalysisException extends RuntimeException {

    public AiAnalysisException(String message) {
        super(message);
    }

    public AiAnalysisException(String message, Throwable cause) {
        super(message, cause);
    }
}
