package com.aiexception.explainer.service;

/**
 * Raised when an unknown or unsupported LLM provider is requested.
 */
public class InvalidProviderException extends AiAnalysisException {

    public InvalidProviderException(String message) {
        super(message);
    }
}
