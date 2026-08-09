package com.aiexception.explainer.service;

import com.aiexception.explainer.domain.AnalysisSection;
import com.aiexception.explainer.domain.Confidence;
import com.aiexception.explainer.domain.SectionKind;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JsonResponseParserTest {

    private JsonResponseParser parser;

    @BeforeEach
    void setUp() {
        parser = new JsonResponseParser(new ObjectMapper());
    }

    @Test
    void stripsMarkdownFence() {
        String raw = "```json\n{\"a\":1}\n```";
        assertEquals("{\"a\":1}", parser.extractJson(raw));
    }

    @Test
    void slicesBraceRegionFromProse() {
        String raw = "Here is the analysis: {\"a\":1} hope that helps";
        assertEquals("{\"a\":1}", parser.extractJson(raw));
    }

    @Test
    void parseTreeRejectsMalformedJson() {
        assertThrows(InvalidAiResponseException.class, () -> parser.parseTree("{not json"));
    }

    @Test
    void parseConfidenceFallsBackToMedium() {
        assertEquals(Confidence.MEDIUM, parser.parseConfidence("maybe"));
        assertEquals(Confidence.HIGH, parser.parseConfidence(" high "));
    }

    @Test
    void textOrFallsBackWhenMissing() {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode node = mapper.createObjectNode();
        assertEquals("fallback", parser.textOr(node, "missing", "fallback"));
    }

    @Test
    void listOrFiltersNonText() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode node = mapper.readTree("{\"items\":[\"a\", 42, \"\", \"b\"]}");
        assertEquals(List.of("a", "b"), parser.listOr(node, "items"));
    }

    @Test
    void parsesSectionsWithDefaults() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode node = mapper.readTree("""
                {"sections":[
                  {"title":"Trace","content":"line1\\nline2"},
                  {"title":"Checks","items":["a","b"],"kind":"LIST"},
                  {"title":"Unknown kind","content":"x","kind":"BOGUS"}
                ]}
                """);
        List<AnalysisSection> sections = parser.parseSections(node);
        assertEquals(3, sections.size());
        assertEquals(SectionKind.TEXT, sections.get(0).kind());
        assertEquals("line1\nline2", sections.get(0).content());
        assertEquals(List.of("a", "b"), sections.get(1).items());
        assertEquals(SectionKind.LIST, sections.get(1).kind());
        assertEquals(SectionKind.TEXT, sections.get(2).kind()); // unknown kind falls back
    }

    @Test
    void parsesSectionsWhenAbsent() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode node = mapper.createObjectNode();
        assertTrue(parser.parseSections(node).isEmpty());
    }
}
