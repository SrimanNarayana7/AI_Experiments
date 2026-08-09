package com.aiexception.explainer.service.analyzer;

import com.aiexception.explainer.domain.AnalysisType;
import com.aiexception.explainer.service.JsonResponseParser;
import org.springframework.stereotype.Component;

/**
 * Analyzes Selenium WebDriver failures.
 */
@Component
public class SeleniumAnalyzer extends BaseAnalyzer {

    public SeleniumAnalyzer(JsonResponseParser parser) {
        super(parser);
    }

    @Override
    public AnalysisType type() {
        return AnalysisType.SELENIUM;
    }

    @Override
    protected String persona() {
        return "Selenium WebDriver test automation expert with deep knowledge of element interaction, explicit/fluent waits, driver sessions, and browser automation errors";
    }

    @Override
    protected String extraInstructions() {
        return """
                This is a Selenium failure. Focus on element interaction errors (NoSuchElementException,
                ElementNotInteractableException, StaleElementReferenceException), waits, and WebDriver session issues.
                """;
    }
}
