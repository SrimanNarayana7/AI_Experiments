import { describe, expect, it } from "vitest";
import { mergeBatchOutcomes } from "../src/analysis/merge.js";
import type { BatchOutcome } from "../src/langflow/batchRunner.js";
import type { DomBatch } from "../src/dom/domChunker.js";
import type { ElementAnalysis } from "../src/validation/schema.js";
import { makeElement } from "./helpers.js";

function batch(id: string, elements: ReturnType<typeof makeElement>[]): DomBatch {
  return { batchId: id, elementIds: elements.map((el) => el.elementId), elements, contextNote: "", estimatedTokens: 100 };
}

function element(label: string, score = 90): ElementAnalysis {
  return {
    element: label,
    tag: "button",
    primary: { strategy: "id", locator: `#${label}`, score, reason: "stable" },
    fallbacks: [],
    risks: [],
    pageObject: { field: label, code: `readonly ${label} = ...;` },
  };
}

describe("mergeBatchOutcomes", () => {
  it("assigns elementIds by input order per batch", () => {
    const b1 = batch("batch-01", [makeElement({ index: 0 }), makeElement({ index: 1 })]);
    const b2 = batch("batch-02", [makeElement({ index: 2 })]);
    const outcomes: BatchOutcome[] = [
      { batch: b1, elements: [element("a"), element("b")], warnings: [], attempts: 1 },
      { batch: b2, elements: [element("c")], warnings: ["warn"], attempts: 1 },
    ];
    const merged = mergeBatchOutcomes(outcomes);
    expect(merged.elements.map((el) => el.elementId)).toEqual(["el-0000", "el-0001", "el-0002"]);
    expect(merged.summary.elementsAnalyzed).toBe(3);
    expect(merged.summary.warnings).toContain("warn");
  });

  it("recomputes summary from final scores", () => {
    const b1 = batch("batch-01", [makeElement({ index: 0 }), makeElement({ index: 1 })]);
    const outcomes: BatchOutcome[] = [
      {
        batch: b1,
        elements: [
          { ...element("a", 90), finalScore: 95 },
          { ...element("b", 60), finalScore: 45 },
        ],
        warnings: [],
        attempts: 1,
      },
    ];
    const merged = mergeBatchOutcomes(outcomes);
    expect(merged.summary.highConfidence).toBe(1);
    expect(merged.summary.avgScore).toBe(70);
  });

  it("skips elements missing from a batch result without crashing", () => {
    const b1 = batch("batch-01", [makeElement({ index: 0 }), makeElement({ index: 1 }), makeElement({ index: 2 })]);
    const outcomes: BatchOutcome[] = [
      { batch: b1, elements: [element("a"), element("b")], warnings: [], attempts: 1 },
    ];
    const merged = mergeBatchOutcomes(outcomes);
    expect(merged.elements).toHaveLength(2);
  });
});
