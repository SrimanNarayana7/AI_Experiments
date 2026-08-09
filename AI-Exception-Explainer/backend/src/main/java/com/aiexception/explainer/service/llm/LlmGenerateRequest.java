package com.aiexception.explainer.service.llm;

/**
 * Provider-independent request sent to an LLM.
 */
public record LlmGenerateRequest(
        String model,
        String prompt,
        boolean stream,
        double temperature,
        int maxTokens
) {
}
