package com.aiexception.explainer.service;

import com.aiexception.explainer.config.GroqProperties;
import com.aiexception.explainer.config.OllamaProperties;
import com.aiexception.explainer.domain.Analysis;
import com.aiexception.explainer.domain.AnalysisType;
import com.aiexception.explainer.domain.LlmProvider;
import com.aiexception.explainer.service.analyzer.Analyzer;
import com.aiexception.explainer.service.analyzer.AnalyzerRegistry;
import com.aiexception.explainer.service.classifier.InputClassifier;
import com.aiexception.explainer.service.llm.LlmClient;
import com.aiexception.explainer.service.llm.LlmClientRegistry;
import com.aiexception.explainer.service.llm.LlmGenerateRequest;
import com.aiexception.explainer.service.llm.ModelDiscovery;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class AnalysisServiceTest {

    @Mock
    private InputClassifier classifier;
    @Mock
    private AnalyzerRegistry analyzerRegistry;
    @Mock
    private LlmClientRegistry llmClientRegistry;
    @Mock
    private LlmClient ollamaClient;
    @Mock
    private Analyzer analyzer;

    private AnalysisService service;

    private static final String JSON_RESPONSE = """
            {"exceptionType":"NPE","rootCause":"rc","technicalExplanation":"te","fix":"f",
             "bestPractices":["a"],"preventionTips":["b"],"confidence":"HIGH"}
            """;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        OllamaProperties ollamaProps = new OllamaProperties("http://localhost:11434", "", 5000, 2048, 0.2);
        GroqProperties groqProps = new GroqProperties("https://api.groq.com/openai/v1", "key", "groq-model", 5000, 2048, 0.2);
        JsonResponseParser parser = new JsonResponseParser(new ObjectMapper());

        when(ollamaClient.provider()).thenReturn(LlmProvider.OLLAMA);
        when(ollamaClient.isConfigured()).thenReturn(true);
        when(llmClientRegistry.forProvider(LlmProvider.OLLAMA)).thenReturn(ollamaClient);
        when(llmClientRegistry.resolve(null)).thenReturn(LlmProvider.OLLAMA);
        when(llmClientRegistry.resolve("GROQ")).thenReturn(LlmProvider.GROQ);

        when(classifier.classify(any())).thenReturn(AnalysisType.EXCEPTION);
        when(analyzer.type()).thenReturn(AnalysisType.EXCEPTION);
        when(analyzerRegistry.forType(AnalysisType.EXCEPTION)).thenReturn(analyzer);
        when(analyzer.buildPrompt(any())).thenReturn("prompt");
        when(analyzer.parse(any(JsonNode.class))).thenAnswer(inv -> {
            JsonNode node = inv.getArgument(0);
            return new Analysis(AnalysisType.EXCEPTION.name(),
                    parser.textOr(node, "exceptionType", "Unknown"),
                    parser.textOr(node, "rootCause", ""),
                    parser.textOr(node, "technicalExplanation", ""),
                    parser.textOr(node, "fix", ""),
                    parser.listOr(node, "bestPractices"),
                    parser.listOr(node, "preventionTips"),
                    List.of(),
                    parser.parseConfidence(node.path("confidence").asText()));
        });

        service = new AnalysisService(classifier, analyzerRegistry, parser, llmClientRegistry,
                ollamaProps, groqProps, 4);
    }

    @Test
    void analyzeWithRequestedModelUsesIt() {
        when(ollamaClient.generate(any(LlmGenerateRequest.class))).thenReturn(Mono.just(JSON_RESPONSE));

        StepVerifier.create(service.analyze("some exception", LlmProvider.OLLAMA, "qwen3:8b"))
                .assertNext(a -> {
                    assertEquals("NPE", a.exceptionType());
                    assertEquals(AnalysisType.EXCEPTION.name(), a.analysisType());
                })
                .verifyComplete();
    }

    @Test
    void analyzeFailsWhenOllamaUnavailable() {
        when(ollamaClient.generate(any(LlmGenerateRequest.class)))
                .thenReturn(Mono.error(new OllamaUnavailableException("Ollama is not reachable")));

        StepVerifier.create(service.analyze("some exception", LlmProvider.OLLAMA, "qwen3:8b"))
                .expectErrorMatches(e -> e instanceof OllamaUnavailableException)
                .verify();
    }

    @Test
    void analyzeGroqNotConfiguredFails() {
        when(ollamaClient.isConfigured()).thenReturn(false);
        when(llmClientRegistry.forProvider(LlmProvider.GROQ)).thenReturn(ollamaClient);

        StepVerifier.create(service.analyze("x", LlmProvider.GROQ, "m"))
                .expectErrorMatches(e -> e instanceof GroqNotConfiguredException)
                .verify();
    }

    @Test
    void ollamaNoDefaultModelSingleInstalledIsChosen() {
        when(ollamaClient.listModels())
                .thenReturn(Mono.just(new ModelDiscovery(LlmProvider.OLLAMA, List.of("qwen3:8b"), true, null)));
        when(ollamaClient.generate(any(LlmGenerateRequest.class))).thenReturn(Mono.just(JSON_RESPONSE));

        StepVerifier.create(service.analyze("x", LlmProvider.OLLAMA, null))
                .assertNext(a -> assertEquals("NPE", a.exceptionType()))
                .verifyComplete();
    }

    @Test
    void compareCapturesPartialFailures() {
        when(ollamaClient.generate(any(LlmGenerateRequest.class)))
                .thenReturn(Mono.just(JSON_RESPONSE))
                .thenReturn(Mono.error(new OllamaUnavailableException("boom")));

        StepVerifier.create(service.compare("x", LlmProvider.OLLAMA, List.of("m1", "m2")))
                .assertNext(results -> {
                    assertEquals(2, results.size());
                    assertEquals("m1", results.get(0).model());
                    assertEquals("NPE", results.get(0).analysis().exceptionType());
                    assertEquals("m2", results.get(1).model());
                    assertEquals(null, results.get(1).analysis());
                    assertEquals(true, results.get(1).error() != null);
                })
                .verifyComplete();
    }

    @Test
    void compareRejectsMoreThanMaxModels() {
        StepVerifier.create(service.compare("x", LlmProvider.OLLAMA, List.of("a", "b", "c", "d", "e")))
                .expectErrorMatches(e -> e instanceof InvalidModelException)
                .verify();
    }
}
