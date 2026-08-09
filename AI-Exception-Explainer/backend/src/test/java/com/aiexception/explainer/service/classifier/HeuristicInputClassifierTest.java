package com.aiexception.explainer.service.classifier;

import com.aiexception.explainer.domain.AnalysisType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HeuristicInputClassifierTest {

    private final HeuristicInputClassifier classifier = new HeuristicInputClassifier();

    @Test
    void classifiesSqlException() {
        String sql = "org.postgresql.util.PSQLException: ERROR: syntax error at or near \"FROM\"";
        assertEquals(AnalysisType.SQL, classifier.classify(sql));
    }

    @Test
    void classifiesSqlState() {
        String sql = "java.sql.SQLException: SQLSTATE 23505: duplicate key value violates unique constraint";
        assertEquals(AnalysisType.SQL, classifier.classify(sql));
    }

    @Test
    void classifiesPlaywright() {
        String pw = "TimeoutError: page.locator('#login').click() timed out after 30000ms\nnet::ERR_CONNECTION_REFUSED";
        assertEquals(AnalysisType.PLAYWRIGHT, classifier.classify(pw));
    }

    @Test
    void classifiesSelenium() {
        String sel = "org.openqa.selenium.ElementNotInteractableException: element not interactable\n\tat org.openqa.selenium...";
        assertEquals(AnalysisType.SELENIUM, classifier.classify(sel));
    }

    @Test
    void classifiesApiError() {
        String api = "org.springframework.web.client.HttpClientErrorException$Unauthorized: 401 Unauthorized: [no body]";
        assertEquals(AnalysisType.API_ERROR, classifier.classify(api));
    }

    @Test
    void classifiesApiStatusLine() {
        String api = "HTTP/1.1 500 Internal Server Error\n{\"error\":\"boom\"}";
        assertEquals(AnalysisType.API_ERROR, classifier.classify(api));
    }

    @Test
    void classifiesLog() {
        String log = "2026-08-09 03:45:12 ERROR c.a.e.OrderService - Failed to charge card: timeout";
        assertEquals(AnalysisType.LOG, classifier.classify(log));
    }

    @Test
    void logWithStackTraceStaysException() {
        String logWithTrace = "2026-08-09 03:45:12 ERROR c.a.e.OrderService - Failed to charge card\n"
                + "java.lang.NullPointerException: boom\n"
                + "\tat com.example.OrderService.charge(OrderService.java:42)\n"
                + "\tat com.example.Main.main(Main.java:9)";
        assertEquals(AnalysisType.EXCEPTION, classifier.classify(logWithTrace));
    }

    @Test
    void defaultsToException() {
        String plain = "java.lang.NullPointerException: Cannot invoke \"String.length()\" because \"s\" is null\n"
                + "\tat com.example.Main.process(Main.java:42)";
        assertEquals(AnalysisType.EXCEPTION, classifier.classify(plain));
    }

    @Test
    void blankInputDefaultsToException() {
        assertEquals(AnalysisType.EXCEPTION, classifier.classify("   "));
        assertEquals(AnalysisType.EXCEPTION, classifier.classify(null));
    }

    @Test
    void playwrightTimeoutWithoutPageContextIsNotPlaywright() {
        String genericTimeout = "java.util.concurrent.TimeoutException: did not observe any item";
        assertEquals(AnalysisType.EXCEPTION, classifier.classify(genericTimeout));
    }
}
