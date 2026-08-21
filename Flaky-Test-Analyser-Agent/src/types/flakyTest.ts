/**
 * Shared types for the Flaky Test Analyzer frontend.
 *
 * These describe the UI-facing data model. The Langflow workflow remains the
 * source of truth for flakiness analysis; this frontend only renders what the
 * agent returns.
 */

export type AnalysisStatus =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'analyzing'
  | 'success'
  | 'error';

export type AnalysisStage = 'preparing' | 'sending' | 'generating';

export interface UploadedBuild {
  file: File;
  /** Raw file contents (never parsed by the frontend analysis logic). */
  content: string;
  /** True once the file passes JSON validation. */
  valid: boolean;
  size: number;
}

export interface BuildDetails {
  fileName: string;
  fileSize: number;
  uploadTimestamp: string;
  validationStatus: 'valid' | 'invalid';
}

export interface FlakyTest {
  name: string;
  hypothesis?: string;
  build1Status?: string;
  build2Status?: string;
  action?: string;
}

export interface ConsistentFailure {
  name: string;
  rootCause?: string;
  build1Status?: string;
  build2Status?: string;
  action?: string;
}

export interface RerunRecommendation {
  rerun: string[];
  engineering: string[];
}

export interface Summary {
  flakyCount?: number;
  consistentFailureCount?: number;
  build1Total?: number;
  build2Total?: number;
  health?: string;
  text?: string;
}

export interface AnalysisResult {
  flakyTests: FlakyTest[];
  consistentFailures: ConsistentFailure[];
  rerunRecommendation: RerunRecommendation;
  summary: Summary;
  rawResponse: string;
  /** True when only the raw AI response is available (structured parsing failed). */
  fallbackOnly?: boolean;
}

/** A build slot used by the upload UI. */
export type BuildSlot = 'build1' | 'build2';
