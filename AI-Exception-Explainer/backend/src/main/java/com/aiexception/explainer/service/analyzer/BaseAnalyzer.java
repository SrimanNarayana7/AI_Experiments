package com.aiexception.explainer.service.analyzer;

import com.aiexception.explainer.domain.Analysis;
import com.aiexception.explainer.domain.AnalysisSection;
import com.aiexception.explainer.domain.Confidence;
import com.aiexception.explainer.service.JsonResponseParser;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/**
 * Shared prompt skeleton and parse flow for all analyzers.
 * Subclasses provide their own persona and guidance; parsing is shared.
 */
public abstract class BaseAnalyzer implements Analyzer {

    private final JsonResponseParser parser;

    protected BaseAnalyzer(JsonResponseParser parser) {
        this.parser = parser;
    }

    protected JsonResponseParser parser() {
        return parser;
    }

    /**
     * Returns the persona + guidance section of the prompt.
     */
    protected abstract String persona();

    /**
     * Returns any type-specific instructions to append after the JSON schema
     * (e.g. about optional "sections"), or an empty string.
     */
    protected String extraInstructions() {
        return "";
    }

    @Override
    public String buildPrompt(String input) {
        return """
                You are an expert %s.

                Analyze the input below and respond with JSON only.
                Do not include markdown code fences, commentary, or any text outside the JSON object.

                The JSON object must contain exactly these keys:
                {
                  "exceptionType": "The type/name of the error or issue, e.g. NullPointerException",
                  "rootCause": "Human-friendly explanation of the root cause",
                  "technicalExplanation": "Precise technical explanation of what happened internally",
                  "fix": "Concrete fix with code example when applicable",
                  "bestPractices": ["List of best practices to follow"],
                  "preventionTips": ["List of tips to prevent this issue"],
                  "confidence": "HIGH, MEDIUM, or LOW"
                }

                %s
                Input to analyze:
                %s
                """.formatted(persona(), extraInstructions(), input);
    }

    @Override
    public Analysis parse(JsonNode node) {
        String exceptionType = parser.textOr(node, "exceptionType", "Unknown");
        String rootCause = parser.textOr(node, "rootCause", "No root cause provided.");
        String technicalExplanation = parser.textOr(node, "technicalExplanation", "No technical explanation provided.");
        String fix = parser.textOr(node, "fix", "No fix suggested.");
        List<String> bestPractices = parser.listOr(node, "bestPractices");
        List<String> preventionTips = parser.listOr(node, "preventionTips");
        List<AnalysisSection> sections = parser.parseSections(node);
        Confidence confidence = parser.parseConfidence(node.path("confidence").asText());

        return new Analysis(
                type().name(),
                exceptionType,
                rootCause,
                technicalExplanation,
                fix,
                bestPractices,
                preventionTips,
                sections,
                confidence
        );
    }
}
