package com.aiexception.explainer.service.analyzer;

import com.aiexception.explainer.domain.AnalysisType;
import com.aiexception.explainer.service.JsonResponseParser;
import org.springframework.stereotype.Component;

/**
 * Analyzes REST/HTTP API errors.
 */
@Component
public class ApiErrorAnalyzer extends BaseAnalyzer {

    public ApiErrorAnalyzer(JsonResponseParser parser) {
        super(parser);
    }

    @Override
    public AnalysisType type() {
        return AnalysisType.API_ERROR;
    }

    @Override
    protected String persona() {
        return "REST API and HTTP protocol expert with deep knowledge of status codes, headers, retries, idempotency, and client/server error handling";
    }

    @Override
    protected String extraInstructions() {
        return """
                This is an API/HTTP error. Focus on the status code, request method, headers, response body,
                whether it is a client (4xx) or server (5xx) error, retry/idempotency implications, and how to fix it.
                """;
    }
}
