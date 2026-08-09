package com.aiexception.explainer.service.classifier;

import com.aiexception.explainer.domain.AnalysisType;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Heuristic, provider-independent input classifier. Precedence (first match wins):
 * SQL -> PLAYWRIGHT -> SELENIUM -> API_ERROR -> LOG -> EXCEPTION.
 */
@Component
public class HeuristicInputClassifier implements InputClassifier {

    private static final Pattern SQL_ORACLE = Pattern.compile("(?i)ORA-\\d{5}");
    private static final Pattern SQL_STATE = Pattern.compile("(?i)\\bSQLSTATE\\b");
    private static final Pattern SQL_DRIVER = Pattern.compile("(?i)(java\\.sql\\.SQLException|com\\.mysql\\.cj|org\\.postgresql|com\\.microsoft\\.sqlserver|oracle\\.jdbc)");
    private static final Pattern SQL_DIALECT = Pattern.compile("(?i)(syntax error at or near|you have an error in your sql syntax|mysql server version|near \\\"|psqlexception|sqlserverexception|sqlexception)");
    private static final Pattern SQL_KEYWORDS = Pattern.compile("(?i)\\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\\b.*\\b(FROM|INTO|SET|TABLE|WHERE|INDEX|DATABASE)\\b");

    private static final Pattern PLAYWRIGHT = Pattern.compile("(?i)(playwright|page\\.(locator|click|fill|goto|waitFor|expect)|expect\\([^)]*\\)\\.toHave|net::ERR_|timeouterror)");
    private static final Pattern PLAYWRIGHT_TIMEOUT = Pattern.compile("(?i)timeouterror|net::ERR_");

    private static final Pattern SELENIUM = Pattern.compile("(?i)(org\\.openqa\\.selenium|webdriverexception|nosuchelementexception|elementnotinteractableexception|staleelementreferenceexception|sessionnotcreatedexception|chromedriver|geckodriver)");

    private static final Pattern API_HTTP = Pattern.compile("(?i)HTTP/1\\.[01]\\s+[45]\\d\\d");
    private static final Pattern API_SPRING = Pattern.compile("(?i)(httpclienterrorexception|httpservererrorexception|restclientexception)");
    private static final Pattern API_CURL = Pattern.compile("(?i)\\bcurl:\\s*\\(\\d+\\)");
    private static final Pattern API_STATUS = Pattern.compile("(?i)(status[ -]?code|status)\\b.{0,20}?\\b([45]\\d\\d)\\b");
    private static final Pattern API_EXCEPTION = Pattern.compile("(?i)\\bapiexception\\b");

    private static final Pattern LOG_TIMESTAMP_LEVEL = Pattern.compile(
            "(?m)^\\s*\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}([.,]\\d+)?\\s+\\b(INFO|WARN|ERROR|DEBUG|TRACE)\\b");
    private static final Pattern LOG_LEVEL = Pattern.compile("(?i)\\b(INFO|WARN|ERROR|DEBUG|TRACE)\\b");
    private static final Pattern STACK_FRAME = Pattern.compile("(?m)^\\s*at\\s+\\S+\\s*\\([^)]*\\.(java|kt|scala|groovy):\\d+\\)\\s*$");

    @Override
    public AnalysisType classify(String input) {
        if (input == null || input.isBlank()) {
            return AnalysisType.EXCEPTION;
        }

        String text = input.trim();

        if (isSql(text)) return AnalysisType.SQL;
        if (isPlaywright(text)) return AnalysisType.PLAYWRIGHT;
        if (isSelenium(text)) return AnalysisType.SELENIUM;
        if (isApiError(text)) return AnalysisType.API_ERROR;
        if (isLog(text)) return AnalysisType.LOG;

        return AnalysisType.EXCEPTION;
    }

    private boolean isSql(String text) {
        return SQL_ORACLE.matcher(text).find()
                || SQL_STATE.matcher(text).find()
                || SQL_DRIVER.matcher(text).find()
                || SQL_DIALECT.matcher(text).find()
                || SQL_KEYWORDS.matcher(text).find();
    }

    private boolean isPlaywright(String text) {
        return PLAYWRIGHT.matcher(text).find()
                || (PLAYWRIGHT_TIMEOUT.matcher(text).find() && text.toLowerCase().contains("page."));
    }

    private boolean isSelenium(String text) {
        return SELENIUM.matcher(text).find();
    }

    private boolean isApiError(String text) {
        return API_HTTP.matcher(text).find()
                || API_SPRING.matcher(text).find()
                || API_CURL.matcher(text).find()
                || API_STATUS.matcher(text).find()
                || API_EXCEPTION.matcher(text).find();
    }

    private boolean isLog(String text) {
        boolean hasTimestampLevel = LOG_TIMESTAMP_LEVEL.matcher(text).find()
                || (LOG_LEVEL.matcher(text).find() && text.matches("(?s).*\\d{4}-\\d{2}-\\d{2}.*"));
        if (!hasTimestampLevel) {
            return false;
        }
        // A stack trace dumped into logs should still be analyzed as an exception.
        return !STACK_FRAME.matcher(text).find();
    }
}
