import { describe, expect, it } from "vitest";
import { estimateTokens } from "../src/dom/tokenEstimator.js";
import { chunkElements } from "../src/dom/domChunker.js";
import { makeElement } from "./helpers.js";

describe("tokenEstimator", () => {
  it("estimates ~4 chars per token", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });
});

describe("domChunker", () => {
  it("keeps small DOMs in a single batch", () => {
    const elements = Array.from({ length: 10 }, (_, i) => makeElement({ index: i }));
    const plan = chunkElements(elements);
    expect(plan.batched).toBe(false);
    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].elementIds).toEqual(elements.map((el) => el.elementId));
  });

  it("preserves element order and stable ids across batches", () => {
    const elements = Array.from({ length: 300 }, (_, i) =>
      makeElement({ index: i, text: `Element with a fairly long label number ${i}` }),
    );
    const plan = chunkElements(elements);
    expect(plan.batched).toBe(true);
    const flatIds = plan.batches.flatMap((b) => b.elementIds);
    expect(flatIds).toEqual(elements.map((el) => el.elementId));
  });

  it("keeps related controls (same form) together", () => {
    const formElements = Array.from({ length: 6 }, (_, i) =>
      makeElement({ index: i, context: { form: "login-form" }, text: `Login control ${i} with some extra text` }),
    );
    const rest = Array.from({ length: 60 }, (_, i) => makeElement({ index: i + 100 }));
    const plan = chunkElements([...formElements, ...rest]);
    const firstBatch = plan.batches[0];
    expect(firstBatch.elementIds).toContain("el-0000");
    expect(firstBatch.elementIds).toContain("el-0005");
  });

  it("respects the configured max batch count", () => {
    const elements = Array.from({ length: 600 }, (_, i) => makeElement({ index: i, text: `x`.repeat(80) }));
    const plan = chunkElements(elements);
    expect(plan.batches.length).toBeLessThanOrEqual(12);
  });
});
