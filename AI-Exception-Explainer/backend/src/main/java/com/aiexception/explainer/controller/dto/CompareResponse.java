package com.aiexception.explainer.controller.dto;

import java.util.List;

/**
 * Response for a multi-model comparison.
 */
public record CompareResponse(
        List<ModelAnalysisResultDto> results
) {
}
