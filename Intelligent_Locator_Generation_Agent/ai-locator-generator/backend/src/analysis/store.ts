import { randomUUID } from "node:crypto";
import type { GeneratedFile, ProjectSummary } from "../pom/projectGenerator.js";
import type { LocatorAnalysis } from "../validation/schema.js";

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

export interface AnalysisJobResult {
  analysis: LocatorAnalysis;
  files: GeneratedFile[];
  project: ProjectSummary;
}

export interface AnalysisJob {
  analysisId: string;
  status: "processing" | "completed" | "failed";
  processing: ProcessingInfo;
  domStats: DomStats;
  result?: AnalysisJobResult;
  error?: string;
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const jobs = new Map<string, AnalysisJob>();

function cleanup() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > TTL_MS) jobs.delete(id);
  }
}

export function createJob(processing: ProcessingInfo, domStats: DomStats): AnalysisJob {
  cleanup();
  const job: AnalysisJob = {
    analysisId: randomUUID(),
    status: "processing",
    processing,
    domStats,
    createdAt: Date.now(),
  };
  jobs.set(job.analysisId, job);
  return job;
}

export function getJob(analysisId: string): AnalysisJob | undefined {
  cleanup();
  return jobs.get(analysisId);
}

export function updateJob(job: AnalysisJob, patch: Partial<AnalysisJob>): void {
  Object.assign(job, patch);
}
