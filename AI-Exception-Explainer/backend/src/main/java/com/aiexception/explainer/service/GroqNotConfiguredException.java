package com.aiexception.explainer.service;

/**
 * Raised when Groq is selected but no API key is configured server-side.
 */
public class GroqNotConfiguredException extends AiAnalysisException {

    public GroqNotConfiguredException(String message) {
        super(message);
    }
}
