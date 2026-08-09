package com.aiexception.explainer.service.llm;

import java.util.List;

/**
 * Response from Groq's /chat/completions endpoint (OpenAI-compatible subset).
 */
public record GroqChatResponse(
        List<Choice> choices
) {
    public record Choice(Message message) {
    }

    public record Message(String content) {
    }
}
