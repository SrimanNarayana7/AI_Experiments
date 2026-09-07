import { config } from '../config.js';

export type LangflowErrorCode =
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_RESPONSE'
  | 'LANGFLOW_ERROR';

export class LangflowError extends Error {
  constructor(
    public readonly code: LangflowErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LangflowError';
  }
}

export interface LangflowRunResult {
  output: unknown;
}

function sessionIdFor(): string {
  return `apigen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function runLangflow(
  inputValue: string,
  tweaks: Record<string, unknown>,
): Promise<LangflowRunResult> {
  if (!config.langflow.flowId) {
    throw new LangflowError(
      'LANGFLOW_ERROR',
      'Langflow flow id is not configured.',
    );
  }

  const base = config.langflow.baseUrl.replace(/\/+$/, '');
  const endpoint = `${base}/api/v1/run/${config.langflow.flowId}?stream=false`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.langflow.apiKey) {
    headers['x-api-key'] = config.langflow.apiKey;
  }

  const body = {
    output_type: 'chat',
    input_type: 'text',
    input_value: inputValue,
    session_id: sessionIdFor(),
    tweaks,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.langflow.timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LangflowError('TIMEOUT', 'Langflow request timed out.');
    }
    throw new LangflowError(
      'NETWORK_ERROR',
      'Unable to reach Langflow. Check that it is running.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw mapHttpError(response.status);
  }

  try {
    const output = await response.json();
    return { output };
  } catch {
    throw new LangflowError('INVALID_RESPONSE', 'Langflow returned unreadable data.');
  }
}

function mapHttpError(status: number): LangflowError {
  switch (status) {
    case 401:
      return new LangflowError('UNAUTHORIZED', 'Langflow rejected the API key.');
    case 403:
      return new LangflowError('FORBIDDEN', 'Access to the Langflow workflow is forbidden.');
    case 404:
      return new LangflowError('NOT_FOUND', 'Langflow workflow not found. Check the flow id.');
    case 408:
      return new LangflowError('TIMEOUT', 'Langflow request timed out.');
    case 429:
      return new LangflowError('LANGFLOW_ERROR', 'Langflow is rate-limiting requests.');
    default:
      return new LangflowError(
        'LANGFLOW_ERROR',
        `Langflow returned HTTP ${status}.`,
      );
  }
}
