package com.aiexception.explainer.service.llm;

import java.util.List;

/**
 * Subset of Ollama's /api/tags response needed for model discovery.
 */
public record OllamaModelResponse(
        List<ModelEntry> models
) {
    public record ModelEntry(String name) {
    }
}
