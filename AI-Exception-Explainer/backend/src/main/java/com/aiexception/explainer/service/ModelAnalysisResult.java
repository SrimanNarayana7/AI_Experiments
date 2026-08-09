package com.aiexception.explainer.service;

import com.aiexception.explainer.domain.Analysis;

/**
 * Result of comparing one model's analysis. Either analysis or error is set.
 */
public record ModelAnalysisResult(
        String provider,
        String model,
        Analysis analysis,
        String error
) {
}
