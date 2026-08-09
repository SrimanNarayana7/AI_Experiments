package com.aiexception.explainer.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request payload for multi-model comparison.
 */
public record CompareRequest(
        @NotBlank(message = "Exception text is required")
        @Size(max = 20000, message = "Exception text must not exceed 20000 characters")
        String exception,

        @NotEmpty(message = "At least one model is required for comparison")
        @Size(max = 4, message = "Comparison supports at most 4 models")
        List<@NotBlank(message = "Model name must not be blank") String> models
) {
}
