package com.aiexception.explainer.service;

/**
 * Raised when the AI response cannot be parsed into the expected structure.
 */
public class InvalidAiResponseException extends AiAnalysisException {

    public InvalidAiResponseException(String message) {
        super(message);
    }

    public InvalidAiResponseException(String message, Throwable cause) {
        super(message, cause);
    }
}
