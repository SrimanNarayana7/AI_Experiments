package com.aiexception.explainer.ollama;

import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Thin client for the Ollama REST API.
 * Handles connectivity to the local Ollama server.
 */
public class OllamaClient {

    private final WebClient webClient;
    private final long timeoutMs;

    public OllamaClient(WebClient webClient, long timeoutMs) {
        this.webClient = webClient;
        this.timeoutMs = timeoutMs;
    }

    /**
     * Sends a generation request to Ollama and returns the raw text response.
     */
    public Mono<String> generate(OllamaGenerateRequest request) {
        return webClient.post()
                .uri("/api/generate")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(OllamaGenerateResponse.class)
                .timeout(java.time.Duration.ofMillis(timeoutMs))
                .map(OllamaGenerateResponse::response);
    }
}
