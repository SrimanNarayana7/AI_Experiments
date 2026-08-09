package com.aiexception.explainer.service.analyzer;

import com.aiexception.explainer.domain.AnalysisType;
import com.aiexception.explainer.service.JsonResponseParser;
import org.springframework.stereotype.Component;

/**
 * Analyzes Java exceptions and stack traces.
 */
@Component
public class ExceptionAnalyzer extends BaseAnalyzer {

    public ExceptionAnalyzer(JsonResponseParser parser) {
        super(parser);
    }

    @Override
    public AnalysisType type() {
        return AnalysisType.EXCEPTION;
    }

    @Override
    protected String persona() {
        return "Java and Spring Boot debugger with deep knowledge of Selenium, Playwright, SQL, REST APIs and general software engineering";
    }

    @Override
    protected String extraInstructions() {
        return """
                Analyze the exception, stack trace, error or log below.
                """;
    }
}
