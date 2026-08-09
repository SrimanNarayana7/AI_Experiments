package com.aiexception.explainer.service.analyzer;

import com.aiexception.explainer.domain.AnalysisType;
import com.aiexception.explainer.service.JsonResponseParser;
import org.springframework.stereotype.Component;

/**
 * Analyzes application log output.
 */
@Component
public class LogAnalyzer extends BaseAnalyzer {

    public LogAnalyzer(JsonResponseParser parser) {
        super(parser);
    }

    @Override
    public AnalysisType type() {
        return AnalysisType.LOG;
    }

    @Override
    protected String persona() {
        return "application logging and observability engineer with deep knowledge of log levels, log formats, and debugging from log output";
    }

    @Override
    protected String extraInstructions() {
        return """
                This is application log output. Focus on timestamps, log levels (INFO, WARN, ERROR, DEBUG, TRACE),
                ERROR/WARN clusters, and any stack-trace dumps embedded in the logs. Explain what the application
                was doing when the problem occurred and what the log entries mean.
                """;
    }
}
