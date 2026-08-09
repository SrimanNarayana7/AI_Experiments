package com.aiexception.explainer.domain;

import java.util.List;

/**
 * An optional type-specific section in an analysis result.
 */
public record AnalysisSection(
        String title,
        String content,
        List<String> items,
        SectionKind kind
) {
}
