package com.aiexception.explainer.service.llm;

import com.aiexception.explainer.config.GroqProperties;
import com.aiexception.explainer.domain.LlmProvider;
import com.aiexception.explainer.service.GroqNotConfiguredException;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.test.StepVerifier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GroqLlmClientTest {

    private MockWebServer server;
    private GroqLlmClient client;
    private GroqProperties properties;

    @BeforeEach
    void setUp() {
        server = new MockWebServer();
        properties = new GroqProperties(
                server.url("/").toString(),
                "test-api-key",
                "llama-3.3-70b-versatile",
                5000,
                2048,
                0.2);
        client = new GroqLlmClient(WebClient.builder().baseUrl(server.url("/").toString()).build(), properties);
    }

    @AfterEach
    void tearDown() throws Exception {
        server.shutdown();
    }

    @Test
    void generateSendsBearerHeaderAndParsesContent() throws InterruptedException {
        server.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("{\"choices\":[{\"message\":{\"content\":\"{\\\"rootCause\\\":\\\"x\\\"}\"}}]}"));

        StepVerifier.create(client.generate(new LlmGenerateRequest("llama-3.3-70b-versatile", "prompt", false, 0.2, 2048)))
                .expectNext("{\"rootCause\":\"x\"}")
                .verifyComplete();

        RecordedRequest recorded = server.takeRequest();
        assertEquals("Bearer test-api-key", recorded.getHeader("Authorization"));
        assertTrue(recorded.getBody().readUtf8().contains("llama-3.3-70b-versatile"));
    }

    @Test
    void generateFailsWhenNotConfigured() {
        GroqLlmClient unconfigured = new GroqLlmClient(
                WebClient.builder().build(),
                new GroqProperties("http://localhost:9999", "", "m", 5000, 2048, 0.2));
        StepVerifier.create(unconfigured.generate(new LlmGenerateRequest("m", "p", false, 0.2, 2048)))
                .expectError(GroqNotConfiguredException.class)
                .verify();
    }

    @Test
    void listModelsReturnsConfiguredModel() {
        StepVerifier.create(client.listModels())
                .assertNext(d -> {
                    assertEquals(LlmProvider.GROQ, d.provider());
                    assertEquals(java.util.List.of("llama-3.3-70b-versatile"), d.models());
                    assertTrue(d.available());
                })
                .verifyComplete();
    }

    @Test
    void listModelsUnconfiguredReportsNotConfigured() {
        GroqLlmClient unconfigured = new GroqLlmClient(
                WebClient.builder().build(),
                new GroqProperties("http://localhost:9999", "", "m", 5000, 2048, 0.2));
        StepVerifier.create(unconfigured.listModels())
                .assertNext(d -> assertFalse(d.available()))
                .verifyComplete();
    }

    @Test
    void isConfiguredChecksKeyPresence() {
        assertTrue(client.isConfigured());
        GroqLlmClient unconfigured = new GroqLlmClient(
                WebClient.builder().build(),
                new GroqProperties("http://localhost:9999", " ", "m", 5000, 2048, 0.2));
        assertFalse(unconfigured.isConfigured());
    }
}
