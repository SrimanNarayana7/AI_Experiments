import type { BatchOutcome } from "../langflow/batchRunner.js";
import type { ElementAnalysis, LocatorAnalysis } from "../validation/schema.js";

/**
 * Merge batch results into one analysis. Element IDs are assigned by input
 * order within each batch (the LLM returns elements in source order), so
 * identity is preserved deterministically across batches and re-runs.
 */
export function mergeBatchOutcomes(outcomes: BatchOutcome[], fallbackSummaryWarnings: string[] = []): LocatorAnalysis {
  const elements: ElementAnalysis[] = [];
  const warnings = new Set<string>(fallbackSummaryWarnings);

  for (const outcome of outcomes) {
    outcome.batch.elementIds.forEach((elementId, i) => {
      const result = outcome.elements[i];
      if (!result) return;
      elements.push({ ...result, elementId });
    });
    for (const warning of outcome.warnings) warnings.add(warning);
  }

  const scored = elements.map((el) => ({ ...el, finalScore: el.finalScore ?? el.primary.score }));
  const highConfidence = scored.filter((el) => el.finalScore! >= 80).length;
  const avgScore =
    scored.length === 0 ? 0 : Math.round(scored.reduce((sum, el) => sum + el.finalScore!, 0) / scored.length);

  return {
    summary: {
      elementsAnalyzed: scored.length,
      highConfidence,
      avgScore,
      warnings: [...warnings],
    },
    elements: scored,
  };
}
