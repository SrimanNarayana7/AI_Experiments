package com.aiexception.explainer.domain;

import java.util.List;

/**
 * Domain model for a structured analysis result.
 * Produced by the AI analysis engine and consumed by the API layer.
 */
public record Analysis(
        String analysisType,
        String exceptionType,
        String rootCause,
        String technicalExplanation,
        String fix,
        List<String> bestPractices,
        List<String> preventionTips,
        List<AnalysisSection> sections,
        Confidence confidence
) {
}
