package com.aiexception.explainer.service;

/**
 * Raised when a requested model is not available for the selected provider.
 */
public class InvalidModelException extends AiAnalysisException {

    public InvalidModelException(String message) {
        super(message);
    }
}
