import type { Framework, Language } from "../types/stack.js";
import type { LocatorAnalysis } from "../validation/schema.js";

const FRAMEWORK_LABEL: Record<Framework, string> = {
  selenium: "Selenium",
  playwright: "Playwright",
  cypress: "Cypress",
};

const LANGUAGE_LABEL: Record<Language, string> = {
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  csharp: "C#",
};

/**
 * Guarantee a complete Page Object class in the analysis. If the LLM did not
 * provide pageObjectClass.code, assemble one deterministically from the
 * per-element field snippets so every element still ends up in the class.
 */
export function ensurePageObjectClass(analysis: LocatorAnalysis, framework: Framework, language: Language): void {
  const existing = analysis.pageObjectClass;
  if (existing && existing.code.trim() !== "" && existing.name.trim() !== "") {
    return;
  }

  const name = existing?.name?.trim() || "GeneratedPageObject";
  const fields = analysis.elements
    .filter((el) => el.pageObject.code.trim() !== "")
    .map((el) => indent(el.pageObject.code.trim(), 1));

  const header = `// ${FRAMEWORK_LABEL[framework]} · ${LANGUAGE_LABEL[language]} Page Object (auto-assembled)`;
  const code = [header, "", openClass(name, language), "", ...fields, "", "}"].join("\n");

  analysis.pageObjectClass = { name, language, code };
}

function indent(code: string, level: number): string {
  const pad = "  ".repeat(level);
  return code
    .split("\n")
    .map((line) => (line.trim() === "" ? line : pad + line))
    .join("\n");
}

function openClass(name: string, language: Language): string {
  switch (language) {
    case "python":
      return `class ${name}:\n  def __init__(self, page):\n    self.page = page`;
    case "java":
      return `public class ${name} {\n  private final Object page;\n\n  public ${name}(Object page) {\n    this.page = page;\n  }`;
    case "csharp":
      return `public class ${name} {\n  private readonly object page;\n\n  public ${name}(object page) {\n    this.page = page;\n  }`;
    case "typescript":
    case "javascript":
    default:
      return `class ${name} {\n  constructor(page) {\n    this.page = page;\n  }`;
  }
}
