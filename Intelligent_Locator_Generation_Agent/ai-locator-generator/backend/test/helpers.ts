import { describe, expect, it } from "vitest";
import type { ProcessedElement } from "../src/dom/domProcessor.js";

export function makeElement(overrides: Partial<ProcessedElement> & { index: number }): ProcessedElement {
  return {
    elementId: `el-${String(overrides.index).padStart(4, "0")}`,
    tag: "button",
    attributes: { type: "submit" },
    text: `Button ${overrides.index}`,
    context: {},
    ...overrides,
  };
}
