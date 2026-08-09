package com.aiexception.explainer.service.llm;

import com.aiexception.explainer.config.OllamaProperties;
import com.aiexception.explainer.domain.LlmProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Lists models actually installed in the local Ollama instance via /api/tags.
 */
public class OllamaModelService {

    private static final Logger log = LoggerFactory.getLogger(OllamaModelService.class);

    private final WebClient webClient;
    private final OllamaProperties properties;

    public OllamaModelService(WebClient webClient, OllamaProperties properties) {
        this.webClient = webClient;
        this.properties = properties;
    }

    public Mono<ModelDiscovery> listModels() {
        return webClient.get()
                .uri("/api/tags")
                .retrieve()
                .bodyToMono(OllamaModelResponse.class)
                .map(this::toDiscovery)
                .onErrorResume(e -> {
                    log.warn("Ollama model discovery failed: {}", e.getMessage());
                    return Mono.just(new ModelDiscovery(LlmProvider.OLLAMA, List.of(), false,
                            "Ollama is unavailable"));
                });
    }

    private ModelDiscovery toDiscovery(OllamaModelResponse response) {
        List<String> names = response == null || response.models() == null
                ? List.of()
                : response.models().stream()
                        .map(OllamaModelResponse.ModelEntry::name)
                        .filter(name -> name != null && !name.isBlank())
                        .collect(Collectors.toList());
        return new ModelDiscovery(LlmProvider.OLLAMA, names, true, null);
    }
}
