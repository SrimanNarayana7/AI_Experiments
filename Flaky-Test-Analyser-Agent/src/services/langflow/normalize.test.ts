import { describe, expect, it } from 'vitest';
import { normalizeLangflowResponse } from './normalize';
import { LangflowError } from './errors';

function chatPayload(text: string): unknown {
  return {
    outputs: [
      {
        outputs: {
          message: {
            message: {
              text,
            },
          },
        },
      },
    ],
  };
}

describe('normalizeLangflowResponse', () => {
  it('parses a natural-language report from the Chat Output', () => {
    const text = `## FLAKY_TESTS
| Test Name | Build 1 | Build 2 | Likely Cause | Recommended Action |
|---|---|---|---|---|
| Checkout › Apply coupon | PASS | FAIL | Timing | Rerun |

## CONSISTENT_FAILURES
| Test Name | Build 1 | Build 2 | Probable Root Cause | Recommended Action |
|---|---|---|---|---|
| Login › Auth | FAIL | FAIL | Schema change | Send to Engineering |

## SUMMARY
1 flaky, 1 consistent.`;
    const result = normalizeLangflowResponse(chatPayload(text));
    expect(result.flakyTests).toHaveLength(1);
    expect(result.consistentFailures).toHaveLength(1);
    expect(result.rawResponse).toBe(text);
    expect(result.fallbackOnly).toBe(false);
  });

  it('parses a fenced JSON structured payload', () => {
    const text = '```json\n{"flakyTests":[{"name":"A","hypothesis":"timing"}],"consistentFailures":[],"summary":{"flakyCount":1}}\n```';
    const result = normalizeLangflowResponse(chatPayload(text));
    expect(result.flakyTests).toHaveLength(1);
    expect(result.flakyTests[0].name).toBe('A');
    expect(result.summary.flakyCount).toBe(1);
  });

  it('throws a LangflowError for an unparsable response', () => {
    const payload = { outputs: [] };
    expect(() => normalizeLangflowResponse(payload)).toThrow(LangflowError);
  });

  it('throws a LangflowError when outputs is missing', () => {
    expect(() => normalizeLangflowResponse({ foo: 'bar' })).toThrow(LangflowError);
  });

  it('normalizes a structured rerunRecommendation object', () => {
    const text = '```json\n{"flakyTests":[],"consistentFailures":[],"rerunRecommendation":{"rerun":["A"],"engineering":["B"]}}\n```';
    const result = normalizeLangflowResponse(chatPayload(text));
    expect(result.rerunRecommendation.rerun).toEqual(['A']);
    expect(result.rerunRecommendation.engineering).toEqual(['B']);
  });
});
