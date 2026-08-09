package com.aiexception.explainer.ollama;

/**
 * Request body sent to the Ollama /api/generate endpoint.
 */
public record OllamaGenerateRequest(
        String model,
        String prompt,
        boolean stream,
        double temperature,
        int maxTokens
) {
}
