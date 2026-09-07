export type Framework = 'playwright' | 'restassured' | 'karate' | 'supertest';

export interface CoverageMetrics {
  endpointCoverage: number;
  methodCoverage: number;
  responseCoverage: number;
  requiredFieldCoverage: number;
  boundaryCoverage: number;
  enumCoverage: number;
  securityCoverage: number;
  schemaCoverage: number;
  overall: number;
}

export interface CoverageReport {
  requirements: Record<string, number>;
  generated: Record<string, number>;
  coverage: CoverageMetrics;
  uncovered: string[];
}

export interface ParseResponse {
  title: string;
  version: string;
  format: 'swagger2' | 'openapi3';
  baseUrl: string;
  endpoints: Array<{
    path: string;
    method: string;
    operationId?: string;
    summary?: string;
    tags: string[];
  }>;
  coverageRequirements: Record<string, number>;
  scenarios: unknown[];
  scenarioSummary: { total: number; byType: Record<string, number> };
  coverage: CoverageReport;
  validationErrors: string[];
}

export interface GenerateResponse {
  id: string;
  framework: string;
  projectName: string;
  scenarioCount: number;
  coverage: CoverageReport;
  files: { path: string; content: string }[];
  zipPath: string;
  downloadUrl: string;
}

export interface HistoryItem {
  id: string;
  projectName: string;
  framework: string;
  createdAt: string;
  endpointCount: number;
  scenarioCount: number;
  coverage: number;
}

export interface StatsResponse {
  specificationsProcessed: number;
  endpointsAnalyzed: number;
  testsGenerated: number;
  averageCoverage: number;
  projectsGenerated: number;
  history: HistoryItem[];
}
