import type { AnalysisResult } from '../../types/flakyTest';
import { getPath, findMessageText, parseJsonValue } from '../../utils/langflow';
import { parseAnalysisText } from '../../utils/analysisParser';
import { LangflowError } from './errors';

/**
 * Normalizes a raw Langflow run response into a typed AnalysisResult.
 *
 * The FlakyTest_AI_Agent's Chat Output wraps the report inside a nested
 * `outputs[].outputs.message.message` structure. The content itself can be:
 * - plain text (the natural-language report), or
 * - a JSON string / fenced JSON block with structured fields.
 *
 * This layer extracts the text, parses the four report sections, and keeps
 * the raw text for the AI Analysis panel. It never fabricates missing values.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  return [];
}

/**
 * Normalizes a structured rerunRecommendation field (object, string, or
 * missing) into the required RerunRecommendation shape.
 */
function normalizeRerunRecommendation(
  value: unknown,
): AnalysisResult['rerunRecommendation'] {
  if (isRecord(value)) {
    return {
      rerun: toArray(value.rerun),
      engineering: toArray(value.engineering),
    };
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return { rerun: [], engineering: [value.trim()] };
  }
  return { rerun: [], engineering: [] };
}

/**
 * Normalizes the raw Langflow run response into a typed AnalysisResult.
 * Throws a LangflowError when the content cannot be located.
 */
export function normalizeLangflowResponse(payload: unknown): AnalysisResult {
  if (!isRecord(payload)) {
    throw new LangflowError(
      'INVALID_RESPONSE',
      'Langflow returned an unexpected response format.',
    );
  }

  const outputs = payload.outputs;
  if (!Array.isArray(outputs)) {
    throw new LangflowError(
      'INVALID_RESPONSE',
      'Langflow returned an unexpected response format.',
    );
  }

  // Try a structured JSON payload first (fenced block or object).
  for (const item of outputs) {
    const message = getPath(item, 'outputs.message.message');
    if (isRecord(message)) {
      const text = message.text;
      if (typeof text === 'string' && text.trim().length > 0) {
        const parsed = parseJsonValue(text);
        if (isRecord(parsed)) {
          // A structured payload maps directly onto the analysis shape.
          return {
            flakyTests: Array.isArray(parsed.flakyTests) ? (parsed.flakyTests as AnalysisResult['flakyTests']) : [],
            consistentFailures: Array.isArray(parsed.consistentFailures)
              ? (parsed.consistentFailures as AnalysisResult['consistentFailures'])
              : [],
            rerunRecommendation: normalizeRerunRecommendation(parsed.rerunRecommendation),
            summary:
              isRecord(parsed.summary) || typeof parsed.summary === 'string'
                ? (parsed.summary as AnalysisResult['summary'])
                : {},
            rawResponse: text,
            fallbackOnly: false,
          };
        }
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) {
          const parsedFenced = parseJsonValue(fenced[1]);
          if (isRecord(parsedFenced)) {
            return {
              flakyTests: Array.isArray(parsedFenced.flakyTests)
                ? (parsedFenced.flakyTests as AnalysisResult['flakyTests'])
                : [],
              consistentFailures: Array.isArray(parsedFenced.consistentFailures)
                ? (parsedFenced.consistentFailures as AnalysisResult['consistentFailures'])
                : [],
              rerunRecommendation: normalizeRerunRecommendation(parsedFenced.rerunRecommendation),
              summary:
                isRecord(parsedFenced.summary) || typeof parsedFenced.summary === 'string'
                  ? (parsedFenced.summary as AnalysisResult['summary'])
                  : {},
              rawResponse: text,
              fallbackOnly: false,
            };
          }
        }
      }
    }
  }

  // Fall back to the natural-language report from the Chat Output.
  const text = findMessageText(outputs);
  if (text) {
    return parseAnalysisText(text);
  }

  throw new LangflowError(
    'INVALID_RESPONSE',
    'Analysis completed, but the response could not be rendered as structured results.',
  );
}
