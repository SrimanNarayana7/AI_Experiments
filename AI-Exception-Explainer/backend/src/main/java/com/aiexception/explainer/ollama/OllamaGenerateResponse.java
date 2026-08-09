package com.aiexception.explainer.ollama;

/**
 * Response body received from the Ollama /api/generate endpoint.
 */
public record OllamaGenerateResponse(
        String model,
        String response,
        String doneReason
) {
}
