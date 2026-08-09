package com.aiexception.explainer.controller.dto;

import com.aiexception.explainer.domain.AnalysisSection;

import java.util.List;

/**
 * Structured response returned after AI analysis.
 */
public record AnalyzeResponse(
        String exceptionType,
        String rootCause,
        String technicalExplanation,
        String fix,
        List<String> bestPractices,
        List<String> preventionTips,
        String confidence,
        String analysisType,
        List<AnalysisSection> sections
) {
}
