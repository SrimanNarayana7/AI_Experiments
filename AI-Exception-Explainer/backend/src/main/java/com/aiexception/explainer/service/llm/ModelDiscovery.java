package com.aiexception.explainer.service.llm;

import com.aiexception.explainer.domain.LlmProvider;

import java.util.List;

/**
 * Safe model-discovery result. Never contains secrets.
 */
public record ModelDiscovery(
        LlmProvider provider,
        List<String> models,
        boolean available,
        String message
) {
}
