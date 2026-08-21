import { describe, expect, it } from 'vitest';
import { parseAnalysisText } from './analysisParser';

const MARKDOWN_REPORT = `# Flaky Test Analysis Report

## FLAKY_TESTS
| Test Name | Build 1 | Build 2 | Likely Cause | Recommended Action |
|---|---|---|---|---|
| Checkout › Apply coupon | PASS | FAIL | Timing / synchronization | Rerun |
| Payment › Create payment | FAIL | PASS | Network instability | Rerun |

## CONSISTENT_FAILURES
| Test Name | Build 1 | Build 2 | Probable Root Cause | Recommended Action |
|---|---|---|---|---|
| Login › Authenticate | FAIL | FAIL | Auth service changed the response schema | Send to Engineering |

## RERUN_RECOMMENDATION
- Rerun: Checkout › Apply coupon
- Rerun: Payment › Create payment
- Send to Engineering: Login › Authenticate

## SUMMARY
2 flaky tests, 1 consistent failure. Build 1 total 42 tests, Build 2 total 42 tests. Suite health: Unstable. The suite is mostly stable but needs attention on the auth flow.`;

describe('parseAnalysisText', () => {
  it('extracts flaky tests from a markdown table', () => {
    const result = parseAnalysisText(MARKDOWN_REPORT);
    expect(result.flakyTests).toHaveLength(2);
    expect(result.flakyTests[0].name).toBe('Checkout › Apply coupon');
    expect(result.flakyTests[0].build1Status).toBe('PASS');
    expect(result.flakyTests[0].build2Status).toBe('FAIL');
    expect(result.flakyTests[0].hypothesis).toBe('Timing / synchronization');
    expect(result.flakyTests[0].action).toBe('Rerun');
  });

  it('extracts consistent failures from a markdown table', () => {
    const result = parseAnalysisText(MARKDOWN_REPORT);
    expect(result.consistentFailures).toHaveLength(1);
    expect(result.consistentFailures[0].name).toBe('Login › Authenticate');
    expect(result.consistentFailures[0].build1Status).toBe('FAIL');
    expect(result.consistentFailures[0].build2Status).toBe('FAIL');
    expect(result.consistentFailures[0].rootCause).toBe(
      'Auth service changed the response schema',
    );
  });

  it('extracts rerun recommendations', () => {
    const result = parseAnalysisText(MARKDOWN_REPORT);
    expect(result.rerunRecommendation.rerun).toHaveLength(2);
    expect(result.rerunRecommendation.engineering).toHaveLength(1);
  });

  it('extracts summary counts and health', () => {
    const result = parseAnalysisText(MARKDOWN_REPORT);
    expect(result.summary.flakyCount).toBe(2);
    expect(result.summary.consistentFailureCount).toBe(1);
    expect(result.summary.build1Total).toBe(42);
    expect(result.summary.build2Total).toBe(42);
    expect(result.summary.health).toBe('Unstable');
  });

  it('keeps the raw response', () => {
    const result = parseAnalysisText(MARKDOWN_REPORT);
    expect(result.rawResponse).toBe(MARKDOWN_REPORT);
    expect(result.fallbackOnly).toBe(false);
  });

  it('handles a simple bullet-list report without tables', () => {
    const text = `## FLAKY_TESTS
- Checkout › Apply coupon - timing issue
- Payment › Create payment - network flake

## CONSISTENT_FAILURES
- Login › Authenticate - auth schema mismatch

## SUMMARY
1 flaky, 1 consistent.`;
    const result = parseAnalysisText(text);
    expect(result.flakyTests).toHaveLength(2);
    expect(result.flakyTests[0].name).toContain('Checkout › Apply coupon');
    expect(result.consistentFailures).toHaveLength(1);
  });

  it('returns empty sections for a malformed response instead of crashing', () => {
    const text = 'The AI returned something that is not structured at all. No headings here.';
    const result = parseAnalysisText(text);
    expect(result.flakyTests).toEqual([]);
    expect(result.consistentFailures).toEqual([]);
    expect(result.rerunRecommendation.rerun).toEqual([]);
    expect(result.fallbackOnly).toBe(true);
    expect(result.rawResponse).toBe(text);
  });

  it('extracts flaky tests from plain heading + line format', () => {
    const text = `FLAKY_TESTS:
Checkout › Apply coupon — Timing / synchronization
Payment › Create payment — Network instability

CONSISTENT_FAILURES:
Login › Authenticate — Auth service schema change

SUMMARY: 2 flaky, 1 consistent.`;
    const result = parseAnalysisText(text);
    expect(result.flakyTests).toHaveLength(2);
    expect(result.consistentFailures).toHaveLength(1);
  });

  it('handles the real numbered heading format from the deployed flow', () => {
    const text = `## Test Reliability Comparison Report

### 1. FLAKY_TESTS

| Test | Hypothesis |
|---|---|
| \`redirects to dashboard after successful login\` (auth.spec.ts:60) | Timing: \`page.waitForURL\` timed out in Build 1 but completed in Build 2. Classic timing flake. |

### 2. CONSISTENT_FAILURES (real bugs, failed in BOTH builds)

| Test | Root Cause |
|---|---|
| \`renders revenue chart with correct totals\` (dashboard.spec.ts:186) | Dashboard revenue API returns no data — deterministic reproduction. |

### 3. RERUN_RECOMMENDATION

- **Rerun (flaky — quarantine, no code fix):**
  - \`redirects to dashboard after successful login\`
- **Send to engineering (reproducible bugs — fix required):**
  - \`renders revenue chart with correct totals\` — investigate revenue API

### 4. SUMMARY

Build 1: 50 tests, 47 passed, 3 failed. Build 2: 50 tests, 48 passed, 2 failed. 2 tests are consistent failures; 1 test is flaky. Suite is otherwise healthy.`;

    const result = parseAnalysisText(text);
    expect(result.flakyTests).toHaveLength(1);
    expect(result.flakyTests[0].name).toContain('redirects to dashboard after successful login');
    expect(result.flakyTests[0].hypothesis).toContain('Timing');
    expect(result.consistentFailures).toHaveLength(1);
    expect(result.consistentFailures[0].name).toContain('renders revenue chart with correct totals');
    expect(result.rerunRecommendation.rerun).toHaveLength(1);
    expect(result.rerunRecommendation.engineering).toHaveLength(1);
    expect(result.summary.flakyCount).toBe(1);
    expect(result.summary.consistentFailureCount).toBe(2);
    expect(result.summary.health).toBe('Healthy');
    expect(result.fallbackOnly).toBe(false);
  });
});
