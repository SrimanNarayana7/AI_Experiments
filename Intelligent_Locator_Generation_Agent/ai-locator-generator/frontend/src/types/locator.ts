export type Framework = "selenium" | "playwright" | "cypress";
export type Language = "java" | "python" | "javascript" | "typescript" | "csharp";

export interface LocatorCandidate {
  strategy: string;
  locator: string;
  score: number;
  reason?: string;
}

export interface ValidationCheck {
  label: string;
  ok: boolean;
}

export interface LocatorValidation {
  status: "valid" | "ambiguous" | "not-found" | "fragile";
  matchedCount: number;
  checks: ValidationCheck[];
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
  elementId?: string;
  validation?: LocatorValidation;
  finalScore?: number;
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

export interface ProcessingInfo {
  batched: boolean;
  batchCount: number;
  elementsExtracted: number;
  completedBatches: number;
}

export interface DomStats {
  htmlChars: number;
  estimatedTokens: number;
}

export interface GeneratedFile {
  path: string;
  content: string;
  kind: "page" | "component" | "tab" | "config" | "report" | "readme";
}

export interface ProjectSummary {
  pages: number;
  components: number;
  tabs: number;
  elementsAnalyzed: number;
  stable: number;
  avgScore: number;
  fileCount: number;
}

export type AnalyzeResult =
  | {
      analysisId: string;
      status: "processing";
      processing: ProcessingInfo;
      domStats: DomStats;
    }
  | {
      analysisId: string;
      status: "completed";
      analysis: LocatorAnalysis;
      files: GeneratedFile[];
      project: ProjectSummary;
      processing: ProcessingInfo;
      domStats: DomStats;
    };

export interface AnalysisState {
  analysisId?: string;
  status: "processing" | "completed" | "failed";
  processing: ProcessingInfo;
  domStats: DomStats;
  analysis?: LocatorAnalysis;
  files?: GeneratedFile[];
  project?: ProjectSummary;
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
