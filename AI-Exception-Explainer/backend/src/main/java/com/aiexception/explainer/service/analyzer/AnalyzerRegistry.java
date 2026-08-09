package com.aiexception.explainer.service.analyzer;

import com.aiexception.explainer.domain.AnalysisType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves the {@link Analyzer} for a given {@link AnalysisType}.
 * Spring autowires all Analyzer beans into the map keyed by their type.
 */
@Component
public class AnalyzerRegistry {

    private final Map<AnalysisType, Analyzer> analyzers;

    public AnalyzerRegistry(Map<AnalysisType, Analyzer> analyzers) {
        this.analyzers = new EnumMap<>(AnalysisType.class);
        this.analyzers.putAll(analyzers);
    }

    public Analyzer forType(AnalysisType type) {
        Analyzer analyzer = analyzers.get(type);
        if (analyzer == null) {
            throw new IllegalArgumentException("No analyzer registered for type: " + type);
        }
        return analyzer;
    }
}
