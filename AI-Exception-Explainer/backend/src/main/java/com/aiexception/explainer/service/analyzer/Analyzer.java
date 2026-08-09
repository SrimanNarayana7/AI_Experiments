package com.aiexception.explainer.service.analyzer;

import com.aiexception.explainer.domain.Analysis;
import com.aiexception.explainer.domain.AnalysisType;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * A strategy that knows how to build a prompt for one analysis type and
 * parse the LLM response into a structured {@link Analysis}.
 * Implementations must be provider-independent.
 */
public interface Analyzer {

    AnalysisType type();

    String buildPrompt(String input);

    Analysis parse(JsonNode node);
}
