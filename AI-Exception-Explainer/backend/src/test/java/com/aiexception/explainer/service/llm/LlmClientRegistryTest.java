package com.aiexception.explainer.service.llm;

import com.aiexception.explainer.domain.LlmProvider;
import com.aiexception.explainer.service.InvalidProviderException;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class LlmClientRegistryTest {

    @Test
    void resolvesValidProviders() {
        LlmClient ollama = mock(LlmClient.class);
        LlmClient groq = mock(LlmClient.class);
        LlmClientRegistry registry = new LlmClientRegistry(Map.of(LlmProvider.OLLAMA, ollama, LlmProvider.GROQ, groq));

        assertSame(ollama, registry.forProvider(LlmProvider.OLLAMA));
        assertSame(groq, registry.forProvider(LlmProvider.GROQ));
    }

    @Test
    void unknownProviderThrows() {
        LlmClientRegistry registry = new LlmClientRegistry(Map.of());
        assertThrows(InvalidProviderException.class, () -> registry.forProvider(LlmProvider.OLLAMA));
    }

    @Test
    void resolveStringDefaultsToOllamaAndValidates() {
        LlmClientRegistry registry = new LlmClientRegistry(Map.of());
        assertEquals(LlmProvider.OLLAMA, registry.resolve(null));
        assertEquals(LlmProvider.OLLAMA, registry.resolve(""));
        assertEquals(LlmProvider.GROQ, registry.resolve("groq"));
        assertThrows(InvalidProviderException.class, () -> registry.resolve("unknown"));
    }
}
