package com.aiexception.explainer.service.llm;

import com.aiexception.explainer.domain.LlmProvider;
import com.aiexception.explainer.service.InvalidProviderException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves the {@link LlmClient} for a given {@link LlmProvider}.
 */
@Component
public class LlmClientRegistry {

    private final Map<LlmProvider, LlmClient> clients;

    public LlmClientRegistry(Map<LlmProvider, LlmClient> clients) {
        this.clients = new EnumMap<>(LlmProvider.class);
        this.clients.putAll(clients);
    }

    public LlmClient forProvider(LlmProvider provider) {
        LlmClient client = clients.get(provider);
        if (client == null) {
            throw new InvalidProviderException("Unsupported LLM provider: " + provider);
        }
        return client;
    }

    public LlmProvider resolve(String providerName) {
        if (providerName == null || providerName.isBlank()) {
            return LlmProvider.OLLAMA;
        }
        try {
            return LlmProvider.valueOf(providerName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidProviderException("Unsupported LLM provider: " + providerName);
        }
    }
}
