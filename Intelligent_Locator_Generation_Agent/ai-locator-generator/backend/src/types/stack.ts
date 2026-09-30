export type Framework = "selenium" | "playwright" | "cypress";
export type Language = "java" | "python" | "javascript" | "typescript" | "csharp";

export const SUPPORTED_COMBINATIONS: Record<Framework, Language[]> = {
  selenium: ["java", "python", "javascript", "typescript", "csharp"],
  playwright: ["java", "python", "javascript", "typescript", "csharp"],
  cypress: ["javascript", "typescript"],
};

export function isFramework(value: unknown): value is Framework {
  return value === "selenium" || value === "playwright" || value === "cypress";
}

export function isLanguage(value: unknown): value is Language {
  return (
    value === "java" ||
    value === "python" ||
    value === "javascript" ||
    value === "typescript" ||
    value === "csharp"
  );
}
