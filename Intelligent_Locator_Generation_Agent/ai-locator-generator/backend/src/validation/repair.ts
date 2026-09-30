import { z } from "zod";
import { AnalysisSchema, type LocatorAnalysis } from "./schema.js";

export class InvalidLlmResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLlmResponseError";
  }
}

function extractJsonCandidate(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return null;
}

function clampScores(parsed: any): any {
  const root = parsed;
  if (!root || typeof root !== "object" || !Array.isArray(root.elements)) return parsed;
  for (const el of root.elements) {
    for (const key of ["primary", "fallbacks"]) {
      if (key === "fallbacks") {
        if (!Array.isArray(el.fallbacks)) continue;
        for (const fb of el.fallbacks) {
          if (typeof fb?.score === "number") fb.score = Math.min(100, Math.max(0, Math.round(fb.score)));
        }
      } else if (el.primary && typeof el.primary.score === "number") {
        el.primary.score = Math.min(100, Math.max(0, Math.round(el.primary.score)));
      }
    }
  }
  if (typeof root.summary?.avgScore === "number") {
    root.summary.avgScore = Math.min(100, Math.max(0, root.summary.avgScore));
  }
  return parsed;
}

/**
 * Parse and validate raw LLM output. Extracts JSON from markdown fences,
 * clamps out-of-range scores, and retries with repaired JSON when possible.
 */
export function parseAndValidate(rawText: string): LocatorAnalysis {
  const candidate = extractJsonCandidate(rawText);
  if (!candidate) {
    throw new InvalidLlmResponseError("LLM response did not contain a JSON object.");
  }

  try {
    const parsed = clampScores(JSON.parse(candidate));
    return AnalysisSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`);
      throw new InvalidLlmResponseError(`LLM JSON failed schema validation: ${issues.join("; ")}`);
    }
    throw new InvalidLlmResponseError(`LLM returned malformed JSON: ${(error as Error).message}`);
  }
}
