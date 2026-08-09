package com.aiexception.explainer.service;

/**
 * Raised when Ollama is unavailable or fails to produce a valid response.
 */
public class OllamaUnavailableException extends AiAnalysisException {

    public OllamaUnavailableException(String message) {
        super(message);
    }

    public OllamaUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
