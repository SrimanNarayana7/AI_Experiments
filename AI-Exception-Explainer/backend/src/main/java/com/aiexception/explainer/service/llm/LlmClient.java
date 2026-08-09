package com.aiexception.explainer.service.llm;

import com.aiexception.explainer.domain.LlmProvider;
import reactor.core.publisher.Mono;

/**
 * Provider abstraction for LLM generation and model discovery.
 * Implementations must never leak secrets (API keys, authorization headers).
 */
public interface LlmClient {

    Mono<String> generate(LlmGenerateRequest request);

    Mono<ModelDiscovery> listModels();

    boolean isConfigured();

    LlmProvider provider();
}
