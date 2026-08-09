package com.aiexception.explainer.domain;

/**
 * Categories of input that the classifier can detect and analyzers can handle.
 */
public enum AnalysisType {
    EXCEPTION("Exception"),
    LOG("Log"),
    API_ERROR("API Error"),
    SQL("SQL"),
    PLAYWRIGHT("Playwright"),
    SELENIUM("Selenium");

    private final String label;

    AnalysisType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
