import * as cheerio from "cheerio";
import type { ProcessedElement } from "../dom/domProcessor.js";
import type { ElementAnalysis } from "../validation/schema.js";

export interface ValidationCheck {
  label: string;
  ok: boolean;
}

export interface LocatorValidation {
  status: "valid" | "ambiguous" | "not-found" | "fragile";
  matchedCount: number;
  checks: ValidationCheck[];
}

/** Class patterns typical of CSS-in-JS / module hashes — fragile by nature. */
const FRAGILE_CLASS = /(^|[-_\s])(css|sc|jss|mui|chakra|tw|emotion)-?[a-z0-9]+$|^[a-z0-9]{10,}$|^[a-z0-9]+-[a-z0-9]{6,}$/i;

function cssCandidate(locator: string): string | null {
  const match =
    locator.match(/locator\(\s*['"]([^'"]+)['"]\s*\)/) ??
    locator.match(/cy\.get\(\s*['"]([^'"]+)['"]\s*\)/) ??
    locator.match(/By\.cssSelector\(\s*['"]([^'"]+)['"]\s*\)/) ??
    locator.match(/\$\(\s*['"]([^'"]+)['"]\s*\)/);
  return match ? match[1] : null;
}

function testIdCandidate(locator: string): string | null {
  const match =
    locator.match(/getByTestId\(\s*['"]([^'"]+)['"]\s*\)/) ??
    locator.match(/cy\.get\(\s*['"](?:\[data-testid[=\]]+)([^'"\]]+)/);
  return match ? match[1] : null;
}

function idCandidate(locator: string): string | null {
  const match =
    locator.match(/^#([a-zA-Z0-9_-]+)$/) ??
    locator.match(/By\.id\(\s*['"]([^'"]+)['"]\s*\)/) ??
    locator.match(/getById\(\s*['"]([^'"]+)['"]\s*\)/) ??
    locator.match(/locator\(\s*['"]#([a-zA-Z0-9_-]+)['"]\s*\)/);
  return match ? match[1] : null;
}

function nameCandidate(locator: string): string | null {
  const match = locator.match(/By\.name\(\s*['"]([^'"]+)['"]\s*\)/);
  return match ? match[1] : null;
}

function labelCandidate(locator: string): string | null {
  const match = locator.match(/getByLabel\(\s*['"]([^'"]+)['"]\s*\)/);
  return match ? match[1] : null;
}

interface RoleQuery {
  role: string;
  name?: string;
}

function roleCandidate(locator: string): RoleQuery | null {
  const match = locator.match(/getByRole\(\s*['"]([^'"]+)['"]\s*(?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\s*\)/);
  if (!match) return null;
  return { role: match[1], name: match[2] };
}

function evaluateCss($: cheerio.CheerioAPI, selector: string): number {
  try {
    return $(selector).length;
  } catch {
    return -1;
  }
}

function evaluateTarget(
  $: cheerio.CheerioAPI,
  el: ProcessedElement,
  query: { selector?: string; role?: string; name?: string; label?: string },
): number {
  try {
    if (query.selector) return evaluateCss($, query.selector);
    if (query.role) {
      const base = `[role="${query.role}"],${query.role}`;
      const nodes = $(base).toArray();
      if (!query.name) return nodes.length;
      return nodes.filter((node) => {
        const $node = $(node);
        const text = $node.text().replace(/\s+/g, " ").trim();
        return text.includes(query.name!) || $node.attr("aria-label") === query.name;
      }).length;
    }
    if (query.label) {
      const byAria = $(`[aria-label="${query.label}"]`).length;
      if (byAria > 0) return byAria;
      const label = $(`label`).filter((_, node) => $(node).text().replace(/\s+/g, " ").trim() === query.label).first();
      if (label.length > 0) {
        const forAttr = label.attr("for");
        return forAttr ? $(`#${forAttr}`).length : 0;
      }
      return 0;
    }
    return -1;
  } catch {
    return -1;
  }
}

function queryFor(locator: string): { selector?: string; role?: string; name?: string; label?: string } | null {
  const testid = testIdCandidate(locator);
  if (testid) return { selector: `[data-testid="${testid}"], [data-test="${testid}"], [data-qa="${testid}"], [data-cy="${testid}"]` };
  const id = idCandidate(locator);
  if (id) return { selector: `#${id}` };
  const name = nameCandidate(locator);
  if (name) return { selector: `[name="${name}"]` };
  const label = labelCandidate(locator);
  if (label) return { label };
  const role = roleCandidate(locator);
  if (role) return { role: role.role, name: role.name };
  const css = cssCandidate(locator);
  if (css) return { selector: css };
  return null;
}

function xpathAttributeHint(locator: string): { attr: string; value: string } | null {
  const match = locator.match(/@(id|name|data-testid|data-test|data-qa|data-cy|aria-label)\s*=\s*['"]([^'"]+)['"]/);
  return match ? { attr: match[1], value: match[2] } : null;
}

function validateOne(
  $: cheerio.CheerioAPI,
  el: ProcessedElement,
  locator: string,
): LocatorValidation {
  const checks: ValidationCheck[] = [];
  const query = queryFor(locator);

  if (!query) {
    const hint = xpathAttributeHint(locator);
    if (hint) {
      const attrValue = el.attributes[hint.attr];
      if (attrValue === hint.value) checks.push({ label: "Referenced attribute exists on the element", ok: true });
      else checks.push({ label: `Attribute @${hint.attr} exists`, ok: false });
      const count = evaluateCss($, `[${hint.attr}="${hint.value}"]`);
      checks.push({ label: "Unique match", ok: count === 1 });
      const status = count === 1 ? "valid" : count === 0 ? "not-found" : "ambiguous";
      return { status, matchedCount: Math.max(count, 0), checks };
    }
    return {
      status: "valid",
      matchedCount: 1,
      checks: [{ label: "Selector could not be checked deterministically", ok: true }],
    };
  }

  const matchedCount = evaluateTarget($, el, query);
  if (matchedCount < 0) {
    return {
      status: "valid",
      matchedCount: 0,
      checks: [{ label: "Selector could not be checked deterministically", ok: true }],
    };
  }

  checks.push({ label: "Referenced attribute exists on the element", ok: matchedCount > 0 });
  checks.push({ label: "Unique match", ok: matchedCount === 1 });

  const classValue = el.attributes.class ?? "";
  const fragileClass = classValue.split(/\s+/).some((c) => FRAGILE_CLASS.test(c));
  checks.push({ label: "Stable attribute (no generated class)", ok: !fragileClass });

  let status: LocatorValidation["status"];
  if (matchedCount === 0) status = "not-found";
  else if (matchedCount > 1) status = "ambiguous";
  else status = fragileClass ? "fragile" : "valid";
  return { status, matchedCount, checks };
}

/**
 * Deterministic validation of every primary locator against the original DOM,
 * plus duplicate detection and a combined final score.
 */
export function validateAnalysisAgainstDom(
  elements: ElementAnalysis[],
  processedElements: ProcessedElement[],
  rawHtml: string,
): ElementAnalysis[] {
  const $ = cheerio.load(rawHtml);
  const seenLocators = new Map<string, number>();

  return elements.map((el, i) => {
    const dom = processedElements[i];
    const validation = dom
      ? validateOne($, dom, el.primary.locator)
      : ({ status: "valid" as const, matchedCount: 1, checks: [] });

    let finalScore = el.primary.score;
    if (validation.status === "not-found") finalScore = Math.min(finalScore, 30);
    else if (validation.status === "ambiguous") finalScore = Math.max(finalScore - 12, 0);
    else if (validation.status === "fragile") finalScore = Math.max(finalScore - 15, 0);

    const key = el.primary.locator.trim();
    const duplicate = seenLocators.has(key);
    if (duplicate) {
      finalScore = Math.max(finalScore - 10, 0);
      validation.checks.push({ label: "Duplicate selector (used by another element)", ok: false });
    } else {
      seenLocators.set(key, i);
    }

    return {
      ...el,
      elementId: dom?.elementId ?? el.elementId,
      validation: { ...validation, checks: [...validation.checks] },
      finalScore: Math.min(100, Math.max(0, Math.round(finalScore))),
    };
  });
}
