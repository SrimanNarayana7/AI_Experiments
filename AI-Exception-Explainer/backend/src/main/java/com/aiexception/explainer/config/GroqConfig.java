package com.aiexception.explainer.config;

import com.aiexception.explainer.domain.LlmProvider;
import com.aiexception.explainer.service.llm.GroqLlmClient;
import com.aiexception.explainer.service.llm.LlmClient;
import com.aiexception.explainer.service.llm.OllamaLlmClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.util.Map;

/**
 * Wires the Groq WebClient and the {@link Map} of all LlmClient implementations.
 */
@Configuration
public class GroqConfig {

    @Bean
    public WebClient groqWebClient(GroqProperties properties) {
        HttpClient httpClient = HttpClient.create().followRedirect(true);
        return WebClient.builder()
                .baseUrl(properties.baseUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

    @Bean
    public GroqLlmClient groqLlmClient(WebClient groqWebClient, GroqProperties properties) {
        return new GroqLlmClient(groqWebClient, properties);
    }

    @Bean
    public Map<LlmProvider, LlmClient> llmClients(OllamaLlmClient ollamaLlmClient, GroqLlmClient groqLlmClient) {
        return Map.of(
                LlmProvider.OLLAMA, ollamaLlmClient,
                LlmProvider.GROQ, groqLlmClient
        );
    }
}
