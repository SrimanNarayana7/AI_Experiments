package com.aiexception.explainer.config;

import com.aiexception.explainer.ollama.OllamaClient;
import com.aiexception.explainer.service.llm.OllamaModelService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

/**
 * Wires up the Ollama WebClient, client, and model service beans.
 */
@Configuration
public class OllamaConfig {

    @Bean
    public WebClient ollamaWebClient(OllamaProperties properties) {
        HttpClient httpClient = HttpClient.create()
                .followRedirect(true);

        return WebClient.builder()
                .baseUrl(properties.baseUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

    @Bean
    public OllamaClient ollamaClient(WebClient ollamaWebClient, OllamaProperties properties) {
        return new OllamaClient(ollamaWebClient, properties.timeoutMs());
    }

    @Bean
    public OllamaModelService ollamaModelService(WebClient ollamaWebClient, OllamaProperties properties) {
        return new OllamaModelService(ollamaWebClient, properties);
    }
}
