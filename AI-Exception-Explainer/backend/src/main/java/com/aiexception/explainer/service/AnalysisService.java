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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Orchestrates analysis: classifies input, selects an analyzer, resolves the LLM
 * provider, generates, and parses the structured response. Provider-independent
 * — the classifier, analyzers, and parser know nothing about Ollama or Groq.
 */
@Service
public class AnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisService.class);

    private final InputClassifier classifier;
    private final AnalyzerRegistry analyzerRegistry;
    private final JsonResponseParser parser;
    private final LlmClientRegistry llmClientRegistry;
    private final OllamaProperties ollamaProperties;
    private final GroqProperties groqProperties;
    private final int maxCompareModels;

    public AnalysisService(
            InputClassifier classifier,
            AnalyzerRegistry analyzerRegistry,
            JsonResponseParser parser,
            LlmClientRegistry llmClientRegistry,
            OllamaProperties ollamaProperties,
            GroqProperties groqProperties,
            @Value("${app.max-compare-models}") int maxCompareModels) {
        this.classifier = classifier;
        this.analyzerRegistry = analyzerRegistry;
        this.parser = parser;
        this.llmClientRegistry = llmClientRegistry;
        this.ollamaProperties = ollamaProperties;
        this.groqProperties = groqProperties;
        this.maxCompareModels = maxCompareModels;
    }

    /**
     * Analyzes input using the given provider and model.
     */
    public Mono<Analysis> analyze(String input, LlmProvider provider, String requestedModel) {
        LlmClient client = llmClientRegistry.forProvider(provider);

        if (!client.isConfigured()) {
            return Mono.error(new GroqNotConfiguredException(
                    "Groq is not configured. Set the GROQ_API_KEY environment variable and restart the backend."));
        }

        return resolveModel(client, requestedModel)
                .flatMap(model -> {
                    AnalysisType type = classifier.classify(input);
                    Analyzer analyzer = analyzerRegistry.forType(type);
                    String prompt = analyzer.buildPrompt(input);
                    LlmGenerateRequest request = new LlmGenerateRequest(
                            model, prompt, false, temperatureFor(provider), maxTokensFor(provider));
                    return client.generate(request)
                            .map(parser::extractJson)
                            .map(parser::parseTree)
                            .map(analyzer::parse);
                });
    }

    /**
     * Compares analysis across multiple models of the active provider.
     * Per-model failures are captured as error fields; the request never fails wholesale.
     */
    public Mono<List<ModelAnalysisResult>> compare(String input, LlmProvider provider, List<String> models) {
        if (models == null || models.isEmpty()) {
            return Mono.error(new InvalidModelException("At least one model is required for comparison."));
        }
        if (models.size() > maxCompareModels) {
            return Mono.error(new InvalidModelException(
                    "Comparison supports at most " + maxCompareModels + " models."));
        }

        LlmClient client = llmClientRegistry.forProvider(provider);
        if (!client.isConfigured()) {
            return Mono.error(new GroqNotConfiguredException(
                    "Groq is not configured. Set the GROQ_API_KEY environment variable and restart the backend."));
        }

        return Flux.fromIterable(models)
                .flatMap(model -> analyze(input, provider, model)
                        .map(analysis -> new ModelAnalysisResult(provider.name(), model, analysis, null))
                        .onErrorResume(e -> Mono.just(new ModelAnalysisResult(provider.name(), model, null, e.getMessage()))),
                        models.size())
                .collectList();
    }

    private Mono<String> resolveModel(LlmClient client, String requestedModel) {
        String requested = requestedModel == null ? "" : requestedModel.trim();
        if (!requested.isBlank()) {
            return Mono.just(requested);
        }

        if (client.provider() == LlmProvider.GROQ) {
            if (groqProperties.model() == null || groqProperties.model().isBlank()) {
                return Mono.error(new InvalidModelException(
                        "No Groq model is configured. Set groq.model in application.properties."));
            }
            return Mono.just(groqProperties.model());
        }

        // Ollama: no hardcoded default — use the discovered list to pick the sole model,
        // or fail with guidance to open Settings.
        return client.listModels()
                .flatMap(discovery -> {
                    if (discovery.models() == null || discovery.models().isEmpty()) {
                        return Mono.error(new InvalidModelException(
                                "No Ollama model selected. Open Settings, pick an installed model, and try again."));
                    }
                    if (discovery.models().size() == 1) {
                        return Mono.just(discovery.models().get(0));
                    }
                    return Mono.error(new InvalidModelException(
                            "Multiple Ollama models are installed. Select one in Settings."));
                });
    }

    private double temperatureFor(LlmProvider provider) {
        return provider == LlmProvider.GROQ ? groqProperties.temperature() : ollamaProperties.temperature();
    }

    private int maxTokensFor(LlmProvider provider) {
        return provider == LlmProvider.GROQ ? groqProperties.maxTokens() : ollamaProperties.maxTokens();
    }
}
