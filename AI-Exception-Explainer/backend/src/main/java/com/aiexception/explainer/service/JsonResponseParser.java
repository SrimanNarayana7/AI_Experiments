package com.aiexception.explainer.service;

import com.aiexception.explainer.domain.AnalysisSection;
import com.aiexception.explainer.domain.Confidence;
import com.aiexception.explainer.domain.SectionKind;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Parses and validates the JSON returned by an LLM into structured domain values.
 * Provider-independent and lenient: missing or malformed fields fall back to safe defaults.
 */
@Component
public class JsonResponseParser {

    private static final Logger log = LoggerFactory.getLogger(JsonResponseParser.class);

    private final ObjectMapper objectMapper;

    public JsonResponseParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Extracts the JSON object from a raw LLM response, tolerating markdown
     * code fences and surrounding prose.
     */
    public String extractJson(String rawResponse) {
        String trimmed = rawResponse == null ? "" : rawResponse.trim();

        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```[a-zA-Z]*\\s*", "");
            trimmed = trimmed.replaceFirst("```\\s*$", "");
            trimmed = trimmed.trim();
        }

        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    /**
     * Parses the extracted JSON into a tree, or throws {@link InvalidAiResponseException}.
     */
    public JsonNode parseTree(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse AI response: {}", json);
            throw new InvalidAiResponseException("The AI returned a response that could not be parsed.", e);
        }
    }

    public String textOr(JsonNode node, String field, String fallback) {
        JsonNode value = node.path(field);
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : fallback;
    }

    public List<String> listOr(JsonNode node, String field) {
        List<String> result = new ArrayList<>();
        JsonNode value = node.path(field);
        if (value.isArray()) {
            value.forEach(item -> {
                if (item.isTextual() && !item.asText().isBlank()) {
                    result.add(item.asText());
                }
            });
        }
        return result;
    }

    public Confidence parseConfidence(String value) {
        try {
            return Confidence.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Confidence.MEDIUM;
        }
    }

    /**
     * Reads the optional "sections" array. Each entry may contain title, content,
     * items and kind; missing fields fall back to safe defaults.
     */
    public List<AnalysisSection> parseSections(JsonNode node) {
        List<AnalysisSection> sections = new ArrayList<>();
        JsonNode array = node.path("sections");
        if (!array.isArray()) {
            return sections;
        }
        for (JsonNode entry : array) {
            String title = textOr(entry, "title", "Details");
            String content = textOr(entry, "content", "");
            List<String> items = listOr(entry, "items");
            SectionKind kind = parseKind(entry.path("kind").asText("TEXT"));
            sections.add(new AnalysisSection(title, content, items, kind));
        }
        return sections;
    }

    private SectionKind parseKind(String value) {
        try {
            return SectionKind.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return SectionKind.TEXT;
        }
    }
}
