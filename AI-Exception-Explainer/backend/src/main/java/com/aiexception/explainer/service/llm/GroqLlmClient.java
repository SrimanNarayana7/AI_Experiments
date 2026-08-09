package com.aiexception.explainer.service.llm;

import com.aiexception.explainer.config.GroqProperties;
import com.aiexception.explainer.domain.LlmProvider;
import com.aiexception.explainer.service.GroqApiException;
import com.aiexception.explainer.service.GroqNotConfiguredException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Calls Groq's OpenAI-compatible chat completions API using a server-side API key.
 * The key is added per-request and is never logged or exposed.
 */
public class GroqLlmClient implements LlmClient {

    private static final Logger log = LoggerFactory.getLogger(GroqLlmClient.class);

    private final WebClient webClient;
    private final GroqProperties properties;

    public GroqLlmClient(WebClient webClient, GroqProperties properties) {
        this.webClient = webClient;
        this.properties = properties;
    }

    @Override
    public Mono<String> generate(LlmGenerateRequest request) {
        if (!isConfigured()) {
            return Mono.error(new GroqNotConfiguredException(
                    "Groq is not configured. Set the GROQ_API_KEY environment variable and restart the backend."));
        }

        Map<String, Object> body = Map.of(
                "model", request.model(),
                "messages", List.of(Map.of("role", "user", "content", request.prompt())),
                "temperature", request.temperature(),
                "max_tokens", request.maxTokens(),
                "stream", false
        );

        return webClient.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(GroqChatResponse.class)
                .timeout(Duration.ofMillis(properties.timeoutMs()))
                .map(this::extractContent)
                .onErrorMap(this::mapError);
    }

    @Override
    public Mono<ModelDiscovery> listModels() {
        if (!isConfigured()) {
            return Mono.just(new ModelDiscovery(LlmProvider.GROQ, List.of(), false,
                    "Groq: API key not configured"));
        }
        if (properties.model() == null || properties.model().isBlank()) {
            return Mono.just(new ModelDiscovery(LlmProvider.GROQ, List.of(), true,
                    "Groq: configured but no model set"));
        }
        return Mono.just(new ModelDiscovery(LlmProvider.GROQ, List.of(properties.model()), true, null));
    }

    @Override
    public boolean isConfigured() {
        return properties.apiKey() != null && !properties.apiKey().isBlank();
    }

    @Override
    public LlmProvider provider() {
        return LlmProvider.GROQ;
    }

    private String extractContent(GroqChatResponse response) {
        if (response == null || response.choices() == null || response.choices().isEmpty()
                || response.choices().get(0).message() == null) {
            throw new GroqApiException("Groq returned an unexpected response shape.");
        }
        String content = response.choices().get(0).message().content();
        if (content == null) {
            throw new GroqApiException("Groq returned an empty response.");
        }
        return content;
    }

    private Throwable mapError(Throwable error) {
        if (error instanceof GroqApiException || error instanceof GroqNotConfiguredException) {
            return error;
        }
        log.warn("Groq request failed: {}", safeMessage(error));
        return new GroqApiException("Groq could not complete the request. Check the API key and try again.", error);
    }

    /**
     * Never include the API key or authorization header in logs.
     */
    private String safeMessage(Throwable error) {
        String message = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
        return message.replaceAll("(?i)(bearer\\s+)?[a-zA-Z0-9_-]{20,}", "[REDACTED]");
    }
}
