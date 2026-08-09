package com.aiexception.explainer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the groq.* properties from application.properties.
 */
@ConfigurationProperties(prefix = "groq")
public record GroqProperties(
        String baseUrl,
        String apiKey,
        String model,
        long timeoutMs,
        int maxTokens,
        double temperature
) {
}
