package com.aiexception.explainer.controller.dto;

import com.aiexception.explainer.domain.Analysis;

/**
 * One model's comparison result. Either analysis or error is populated.
 */
public record ModelAnalysisResultDto(
        String provider,
        String model,
        Analysis analysis,
        String error
) {
}
