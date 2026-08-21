/**
 * Typed errors for the Langflow integration.
 *
 * Every failure surfaced to the UI goes through a LangflowError so components
 * can render a user-safe message without exposing stack traces.
 */

export class LangflowError extends Error {
  readonly code: LangflowErrorCode;
  readonly retryable: boolean;

  constructor(code: LangflowErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'LangflowError';
    this.code = code;
    this.retryable = retryable;
  }
}

export type LangflowErrorCode =
  | 'INVALID_INPUT'
  | 'MISSING_CONFIG'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'LANGFLOW_ERROR'
  | 'INVALID_RESPONSE';

export interface LangflowResult {
  data: unknown;
  raw?: unknown;
}
