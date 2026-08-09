package com.aiexception.explainer.service;

/**
 * Raised when Groq fails to complete a request (bad key, timeout, API error).
 */
public class GroqApiException extends AiAnalysisException {

    public GroqApiException(String message) {
        super(message);
    }

    public GroqApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
