package com.aiexception.explainer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the ollama.* properties from application.properties.
 */
@ConfigurationProperties(prefix = "ollama")
public record OllamaProperties(
        String baseUrl,
        String model,
        long timeoutMs,
        int maxTokens,
        double temperature
) {
}
