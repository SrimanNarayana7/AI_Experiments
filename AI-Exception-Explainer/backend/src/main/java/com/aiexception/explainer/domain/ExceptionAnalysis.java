package com.aiexception.explainer.domain;

import java.util.List;

/**
 * Domain model for a structured exception analysis result.
 * Produced by the AI analysis engine and consumed by the API layer.
 */
public record ExceptionAnalysis(
        String exceptionType,
        String rootCause,
        String technicalExplanation,
        String fix,
        List<String> bestPractices,
        List<String> preventionTips,
        Confidence confidence
) {
}
