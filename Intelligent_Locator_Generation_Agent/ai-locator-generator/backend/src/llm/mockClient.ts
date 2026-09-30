import type { Framework, Language } from "../types/stack.js";
import type { ElementAnalysis, LocatorAnalysis } from "../validation/schema.js";

interface ParsedElementLine {
  index: number;
  tag: string;
  attributes: Record<string, string>;
  text: string;
}

const ELEMENT_LINE = /^\[(\d+)\] <(\w+)([^>]*)>(.*)$/;
const ATTR = /([\w-]+)="([^"]*)"/g;

function parseElementLines(elementList: string): ParsedElementLine[] {
  const lines: ParsedElementLine[] = [];
  for (const line of elementList.split("\n")) {
    const match = line.trim().match(ELEMENT_LINE);
    if (!match) continue;
    const attributes: Record<string, string> = {};
    for (const attr of match[3].matchAll(ATTR)) {
      attributes[attr[1]] = attr[2].replace(/&quot;/g, '"');
    }
    lines.push({ index: Number(match[1]), tag: match[2].toLowerCase(), attributes, text: match[4].trim() });
  }
  return lines;
}

function camelCase(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/);
  if (words.length === 0) return "element";
  const first = words.shift()!;
  return first + words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

function primaryFor(el: ParsedElementLine, framework: Framework): { strategy: string; locator: string; score: number; reason: string } {
  const { attributes, tag, text } = el;
  const testid = attributes["data-testid"] ?? attributes["data-test"] ?? attributes["data-qa"] ?? attributes["data-cy"];
  const name = attributes["aria-label"] ?? text;
  const role = attributes.role ?? tag;

  if (testid) {
    const locator =
      framework === "playwright"
        ? `page.getByTestId('${testid}')`
        : framework === "cypress"
          ? `cy.get('[data-testid="${testid}"]')`
          : `By.cssSelector("[data-testid='${testid}']")`;
    return { strategy: "testid", locator, score: 96, reason: "Dedicated test attribute: stable, unique, and framework-agnostic." };
  }
  if (name && framework === "playwright") {
    return {
      strategy: "role",
      locator: `page.getByRole('${role}', { name: '${name.slice(0, 80)}' })`,
      score: 92,
      reason: "Accessible role plus visible/accessible name; robust to styling changes.",
    };
  }
  if (attributes.id) {
    const locator =
      framework === "playwright"
        ? `page.locator('#${attributes.id}')`
        : framework === "cypress"
          ? `cy.get('#${attributes.id}')`
          : `By.id("${attributes.id}")`;
    return { strategy: "id", locator, score: 88, reason: "Stable element id." };
  }
  if (attributes.name) {
    const locator =
      framework === "playwright"
        ? `page.locator("[name='${attributes.name}']")`
        : framework === "cypress"
          ? `cy.get('[name="${attributes.name}"]')`
          : `By.name("${attributes.name}")`;
    return { strategy: "name", locator, score: 85, reason: "Named form control." };
  }
  if (name) {
    const locator =
      framework === "playwright"
        ? `page.getByRole('${role}', { name: '${name.slice(0, 80)}' })`
        : framework === "cypress"
          ? `cy.contains('${role}', '${name.slice(0, 80)}')`
          : `By.xpath("//${tag}[normalize-space()='${name.slice(0, 80)}']")`;
    return { strategy: "role", locator, score: 82, reason: "Visible text matches the element." };
  }
  const cls = (attributes.class ?? "").split(/\s+/).find((c) => c.length > 0);
  if (cls) {
    const locator =
      framework === "playwright"
        ? `page.locator('${tag}.${cls}')`
        : framework === "cypress"
          ? `cy.get('${tag}.${cls}')`
          : `By.cssSelector("${tag}.${cls}")`;
    return { strategy: "css", locator, score: 62, reason: "Class-based selector; acceptable but may be brittle if styles change." };
  }
  const locator =
    framework === "playwright"
      ? `page.locator('${tag}')`
      : framework === "cypress"
        ? `cy.get('${tag}')`
        : `By.tagName("${tag}")`;
  return { strategy: "css", locator, score: 45, reason: "Tag-only selector; very brittle, only a last resort." };
}

function fallbacksFor(el: ParsedElementLine, framework: Framework): Array<{ strategy: string; locator: string; score: number; reason: string }> {
  const fallbacks: Array<{ strategy: string; locator: string; score: number; reason: string }> = [];
  const { attributes, text, tag } = el;
  const testid = attributes["data-testid"] ?? attributes["data-test"] ?? attributes["data-qa"] ?? attributes["data-cy"];
  if (attributes.id) {
    fallbacks.push({
      strategy: "id",
      locator:
        framework === "playwright" ? `page.locator('#${attributes.id}')` : framework === "cypress" ? `cy.get('#${attributes.id}')` : `By.id("${attributes.id}")`,
      score: 88,
      reason: "Direct id reference.",
    });
  }
  if (attributes.name && !attributes.id) {
    fallbacks.push({
      strategy: "name",
      locator:
        framework === "playwright"
          ? `page.locator("[name='${attributes.name}']")`
          : framework === "cypress"
            ? `cy.get('[name="${attributes.name}"]')`
            : `By.name("${attributes.name}")`,
      score: 85,
      reason: "Form control name.",
    });
  }
  if (text && !testid) {
    fallbacks.push({
      strategy: "role",
      locator:
        framework === "playwright"
          ? `page.getByRole('${attributes.role ?? tag}', { name: '${text.slice(0, 80)}' })`
          : framework === "cypress"
            ? `cy.contains('${tag}', '${text.slice(0, 80)}')`
            : `By.xpath("//${tag}[normalize-space()='${text.slice(0, 80)}']")`,
      score: 82,
      reason: "Role plus accessible name.",
    });
  }
  return fallbacks;
}

function pageObjectFor(el: ParsedElementLine, field: string, framework: Framework, language: Language): string {
  const primary = primaryFor(el, framework).locator;
  if (framework === "playwright") {
    if (language === "typescript" || language === "javascript") {
      return `// ${el.tag} ${el.text || ""}\nreadonly ${field} = ${primary};`;
    }
    if (language === "java") {
      return `// ${el.tag} ${el.text || ""}\nprivate final Locator ${field} = ${primary.replace(/^page\./, "page.")};`;
    }
    if (language === "python") {
      return `# ${el.tag} ${el.text || ""}\nself.${field} = ${primary};`;
    }
    return `// ${el.tag} ${el.text || ""}\nprivate IReadOnlyLocator ${field} => ${primary};`;
  }
  if (framework === "selenium") {
    if (language === "java") {
      return `// ${el.tag} ${el.text || ""}\nprivate final By ${field} = ${primary};`;
    }
    if (language === "python") {
      return `# ${el.tag} ${el.text || ""}\n${field} = ${primary};`;
    }
    if (language === "csharp") {
      return `// ${el.tag} ${el.text || ""}\npublic static By ${field} = ${primary};`;
    }
    return `// ${el.tag} ${el.text || ""}\nconst ${field} = ${primary};`;
  }
  if (language === "typescript") {
    return `// ${el.tag} ${el.text || ""}\nget ${field}() { return ${primary}; }`;
  }
  return `// ${el.tag} ${el.text || ""}\nget ${field}() { return ${primary}; }`;
}

function risksFor(el: ParsedElementLine): string[] {
  const risks: string[] = [];
  const { attributes, text } = el;
  const testid = attributes["data-testid"] ?? attributes["data-test"] ?? attributes["data-qa"] ?? attributes["data-cy"];
  if (!testid && !attributes.id && !attributes.name && !attributes["aria-label"] && !text) {
    risks.push("No stable attribute, id, or accessible name available; locator depends on tag/class only.");
  }
  const cls = attributes.class ?? "";
  if (cls && !testid && !attributes.id && !attributes.name) {
    risks.push("Selector relies on CSS class names, which may change with styling refactors.");
  }
  if (attributes.id && /\d{4,}$/.test(attributes.id)) {
    risks.push(`Id "${attributes.id}" may be auto-generated and unstable across renders.`);
  }
  return risks;
}

/**
 * Deterministic mock analysis for development and CI. Derives locators
 * strictly from the supplied element list, so it never invents attributes.
 */
export function generateMockAnalysis(userPrompt: string, framework: Framework, language: Language): LocatorAnalysis {
  const elementList = userPrompt.split("Normalized interactive elements")[1]?.split("Extraction warnings")[0] ?? "";
  const parsed = parseElementLines(elementList);
  const elements: ElementAnalysis[] = parsed.map((el) => {
    const label = el.text || el.attributes["aria-label"] || el.attributes.id || `${el.tag} element #${el.index}`;
    const field = camelCase(label) || `element${el.index}`;
    const primary = primaryFor(el, framework);
    return {
      element: label.slice(0, 120),
      tag: el.tag,
      primary: { ...primary, reason: primary.reason },
      fallbacks: fallbacksFor(el, framework),
      risks: risksFor(el),
      pageObject: { field, code: pageObjectFor(el, field, framework, language) },
    };
  });

  const highConfidence = elements.filter((e) => e.primary.score >= 80).length;
  const avgScore =
    elements.length === 0 ? 0 : Math.round(elements.reduce((sum, e) => sum + e.primary.score, 0) / elements.length);

  return {
    summary: {
      elementsAnalyzed: elements.length,
      highConfidence,
      avgScore,
      warnings: ["Mock analysis mode: deterministic locators generated from the supplied DOM, no LLM call made."],
    },
    elements,
  };
}
