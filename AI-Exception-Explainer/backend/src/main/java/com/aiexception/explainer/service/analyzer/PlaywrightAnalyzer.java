package com.aiexception.explainer.service.analyzer;

import com.aiexception.explainer.domain.AnalysisType;
import com.aiexception.explainer.service.JsonResponseParser;
import org.springframework.stereotype.Component;

/**
 * Analyzes Playwright automation failures.
 */
@Component
public class PlaywrightAnalyzer extends BaseAnalyzer {

    public PlaywrightAnalyzer(JsonResponseParser parser) {
        super(parser);
    }

    @Override
    public AnalysisType type() {
        return AnalysisType.PLAYWRIGHT;
    }

    @Override
    protected String persona() {
        return "Playwright test automation expert with deep knowledge of locators, page interactions, assertions, timeouts, and browser network errors";
    }

    @Override
    protected String extraInstructions() {
        return """
                This is a Playwright failure. Focus on locators, page.* interactions, expect() assertions,
                TimeoutError, network errors (net::ERR_*), and whether the issue is a selector problem, timing problem,
                or environment problem.
                """;
    }
}
