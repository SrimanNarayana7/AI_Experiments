import type { BugTriageResult } from '../../types/triage';

export class TriageError extends Error {
  readonly code: TriageErrorCode;
  readonly retryable: boolean;

  constructor(code: TriageErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'TriageError';
    this.code = code;
    this.retryable = retryable;
  }
}

export type TriageErrorCode =
  | 'INVALID_INPUT'
  | 'MISSING_CONFIG'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ISSUE_NOT_FOUND'
  | 'LANGFLOW_ERROR'
  | 'INVALID_RESPONSE';

export interface TriageResult {
  data: BugTriageResult;
  raw?: unknown;
}
