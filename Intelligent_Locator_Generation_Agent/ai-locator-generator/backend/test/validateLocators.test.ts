import { describe, expect, it } from "vitest";
import { validateAnalysisAgainstDom } from "../src/analysis/validateLocators.js";
import type { ProcessedElement } from "../src/dom/domProcessor.js";
import type { ElementAnalysis } from "../src/validation/schema.js";
import { makeElement } from "./helpers.js";

const HTML = `
<form id="login-form">
  <input id="email" type="email" aria-label="Email" />
  <input id="password" type="password" />
  <button id="login-btn" type="submit" data-testid="login-button">Login</button>
  <button id="cancel-btn" class="css-1abc2d3 e4f5g6" type="button">Cancel</button>
</form>
<a href="/home" class="nav-link">Home</a>
<a href="/about" class="nav-link">About</a>
`;

function processed(overrides: Partial<ProcessedElement> & { index: number }): ProcessedElement {
  return makeElement(overrides);
}

function analysis(primaryLocator: string, score = 90): ElementAnalysis {
  return {
    element: "X",
    tag: "button",
    primary: { strategy: "id", locator: primaryLocator, score, reason: "r" },
    fallbacks: [],
    risks: [],
    pageObject: { field: "x", code: "readonly x = ...;" },
  };
}

describe("validateAnalysisAgainstDom", () => {
  it("marks a unique matching selector as valid", () => {
    const elements = [analysis("page.getByTestId('login-button')")];
    const dom = [processed({ index: 0, tag: "button", attributes: { "data-testid": "login-button" } })];
    const [result] = validateAnalysisAgainstDom(elements, dom, HTML);
    expect(result.validation?.status).toBe("valid");
    expect(result.validation?.matchedCount).toBe(1);
    expect(result.finalScore).toBe(90);
  });

  it("flags a not-found selector and caps the score", () => {
    const elements = [analysis("page.getByTestId('does-not-exist')", 95)];
    const dom = [processed({ index: 0, tag: "button", attributes: {} })];
    const [result] = validateAnalysisAgainstDom(elements, dom, HTML);
    expect(result.validation?.status).toBe("not-found");
    expect(result.finalScore).toBe(30);
  });

  it("flags ambiguous selectors", () => {
    const elements = [analysis("page.locator('.nav-link')", 88)];
    const dom = [processed({ index: 0, tag: "a", attributes: { class: "nav-link" } })];
    const [result] = validateAnalysisAgainstDom(elements, dom, HTML);
    expect(result.validation?.status).toBe("ambiguous");
    expect(result.finalScore).toBe(76);
  });

  it("flags fragile generated classes", () => {
    const elements = [analysis("page.locator('.css-1abc2d3')", 85)];
    const dom = [processed({ index: 0, tag: "button", attributes: { class: "css-1abc2d3 e4f5g6" } })];
    const [result] = validateAnalysisAgainstDom(elements, dom, HTML);
    expect(result.validation?.status).toBe("fragile");
    expect(result.validation?.checks.some((c) => c.label.includes("generated class") && !c.ok)).toBe(true);
  });

  it("detects duplicate selectors across elements", () => {
    const elements = [analysis("page.getByTestId('login-button')", 95), analysis("page.getByTestId('login-button')", 90)];
    const dom = [
      processed({ index: 0, tag: "button", attributes: { "data-testid": "login-button" } }),
      processed({ index: 1, tag: "button", attributes: {} }),
    ];
    const results = validateAnalysisAgainstDom(elements, dom, HTML);
    expect(results[1].validation?.checks.some((c) => c.label.includes("Duplicate") && !c.ok)).toBe(true);
    expect(results[1].finalScore).toBeLessThan(90);
  });
});
