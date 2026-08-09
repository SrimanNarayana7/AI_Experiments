package com.aiexception.explainer.service.analyzer;

import com.aiexception.explainer.domain.AnalysisType;
import com.aiexception.explainer.service.JsonResponseParser;
import org.springframework.stereotype.Component;

/**
 * Analyzes SQL errors.
 */
@Component
public class SqlAnalyzer extends BaseAnalyzer {

    public SqlAnalyzer(JsonResponseParser parser) {
        super(parser);
    }

    @Override
    public AnalysisType type() {
        return AnalysisType.SQL;
    }

    @Override
    protected String persona() {
        return "SQL and database expert with deep knowledge of MySQL, PostgreSQL, SQL Server, Oracle, query plans, and indexing";
    }

    @Override
    protected String extraInstructions() {
        return """
                This is a SQL/database error. Identify the SQL dialect if possible, distinguish syntax errors from
                runtime errors, consider query plans, indexes, constraints and deadlocks, and explain the fix.
                """;
    }
}
