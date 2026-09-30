export type Framework = "selenium" | "playwright" | "cypress";
export type Language = "java" | "python" | "javascript" | "typescript" | "csharp";

export interface LocatorCandidate {
  strategy: string;
  locator: string;
  score: number;
  reason?: string;
}

export interface PageObject {
  field: string;
  code: string;
}

export interface PageObjectClass {
  name: string;
  language: string;
  code: string;
}

export interface ElementAnalysis {
  element: string;
  tag: string;
  primary: LocatorCandidate;
  fallbacks: LocatorCandidate[];
  risks: string[];
  pageObject: PageObject;
}

export interface AnalysisSummary {
  elementsAnalyzed: number;
  highConfidence: number;
  avgScore: number;
  warnings: string[];
}

export interface LocatorAnalysis {
  summary: AnalysisSummary;
  elements: ElementAnalysis[];
  pageObjectClass?: PageObjectClass;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis: LocatorAnalysis;
  error?: string;
}

export const SUPPORTED_LANGUAGES: Record<Framework, Language[]> = {
  selenium: ["java", "python", "javascript", "typescript", "csharp"],
  playwright: ["java", "python", "javascript", "typescript", "csharp"],
  cypress: ["javascript", "typescript"],
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  csharp: "C#",
};

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  selenium: "Selenium",
  playwright: "Playwright",
  cypress: "Cypress",
};
