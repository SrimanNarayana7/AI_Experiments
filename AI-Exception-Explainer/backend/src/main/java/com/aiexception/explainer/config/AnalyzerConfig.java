package com.aiexception.explainer.config;

import com.aiexception.explainer.domain.AnalysisType;
import com.aiexception.explainer.service.analyzer.Analyzer;
import com.aiexception.explainer.service.analyzer.ApiErrorAnalyzer;
import com.aiexception.explainer.service.analyzer.ExceptionAnalyzer;
import com.aiexception.explainer.service.analyzer.LogAnalyzer;
import com.aiexception.explainer.service.analyzer.PlaywrightAnalyzer;
import com.aiexception.explainer.service.analyzer.SeleniumAnalyzer;
import com.aiexception.explainer.service.analyzer.SqlAnalyzer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * Builds the analyzer map explicitly so the AnalyzerRegistry can resolve
 * analyzers by AnalysisType.
 */
@Configuration
public class AnalyzerConfig {

    @Bean
    public Map<AnalysisType, Analyzer> analyzers(
            ExceptionAnalyzer exceptionAnalyzer,
            LogAnalyzer logAnalyzer,
            ApiErrorAnalyzer apiErrorAnalyzer,
            SqlAnalyzer sqlAnalyzer,
            PlaywrightAnalyzer playwrightAnalyzer,
            SeleniumAnalyzer seleniumAnalyzer) {
        return Map.of(
                AnalysisType.EXCEPTION, exceptionAnalyzer,
                AnalysisType.LOG, logAnalyzer,
                AnalysisType.API_ERROR, apiErrorAnalyzer,
                AnalysisType.SQL, sqlAnalyzer,
                AnalysisType.PLAYWRIGHT, playwrightAnalyzer,
                AnalysisType.SELENIUM, seleniumAnalyzer
        );
    }
}
