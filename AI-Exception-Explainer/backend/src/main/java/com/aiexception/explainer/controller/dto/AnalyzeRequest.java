package com.aiexception.explainer.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for text analysis. Provider is optional (defaults to OLLAMA).
 */
public record AnalyzeRequest(
        @NotBlank(message = "Exception text is required")
        @Size(max = 20000, message = "Exception text must not exceed 20000 characters")
        String exception,

        String provider,

        String model
) {
}
