package com.aiexception.explainer.service.llm;

import com.aiexception.explainer.domain.LlmProvider;
import com.aiexception.explainer.ollama.OllamaClient;
import com.aiexception.explainer.ollama.OllamaGenerateRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * Adapter that exposes the existing Ollama integration behind the LlmClient interface.
 */
@Component
public class OllamaLlmClient implements LlmClient {

    private static final Logger log = LoggerFactory.getLogger(OllamaLlmClient.class);

    private final OllamaClient ollamaClient;
    private final OllamaModelService modelService;

    public OllamaLlmClient(OllamaClient ollamaClient, OllamaModelService modelService) {
        this.ollamaClient = ollamaClient;
        this.modelService = modelService;
    }

    @Override
    public Mono<String> generate(LlmGenerateRequest request) {
        OllamaGenerateRequest ollamaRequest = new OllamaGenerateRequest(
                request.model(),
                request.prompt(),
                request.stream(),
                request.temperature(),
                request.maxTokens()
        );
        return ollamaClient.generate(ollamaRequest)
                .onErrorMap(this::mapError);
    }

    @Override
    public Mono<ModelDiscovery> listModels() {
        return modelService.listModels();
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public LlmProvider provider() {
        return LlmProvider.OLLAMA;
    }

    private Throwable mapError(Throwable error) {
        log.warn("Ollama request failed: {}", error.getMessage());
        return new com.aiexception.explainer.service.OllamaUnavailableException(
                "Ollama is not reachable or could not complete the request. " +
                        "Verify that Ollama is running (default: http://localhost:11434) and the model is pulled.",
                error
        );
    }
}
