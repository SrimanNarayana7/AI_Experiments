import config from '../../config/env';
import { LangflowError } from './errors';

/**
 * langflowApi — the only module that talks to Langflow.
 *
 * Responsibilities:
 * - Build the request for the existing FlakyTest_AI_Agent workflow.
 * - Send both Playwright result.json contents as file1 / file2.
 * - Handle HTTP errors, timeouts, and malformed responses.
 * - Return the raw Langflow payload for the normalization layer.
 *
 * The UI never sees Langflow's internal response structure.
 */

export const LANGFLOW_RUN_PATH = '/api/v1/run';

/**
 * The FlakyTest_AI_Agent workflow's Prompt Template node reads two files:
 *
 *   {file1} — Build 1 result.json
 *   {file2} — Build 2 result.json
 *
 * The file contents are injected at run time via Langflow's `tweaks`
 * mechanism, overriding the template variables on the Prompt Template node.
 */
const PROMPT_TEMPLATE_NODE_ID = 'Prompt Template-1C6TD';

function sessionIdFor(): string {
  return `flaky-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildRunUrl(): string {
  const base = (config.proxyUrl ?? config.baseUrl).replace(/\/+$/, '');
  return `${base}${LANGFLOW_RUN_PATH}/${config.flowId}?stream=false`;
}

async function requestAnalysis(
  file1Content: string,
  file2Content: string,
  signal: AbortSignal,
): Promise<unknown> {
  const endpoint = buildRunUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey;
  }

  const body = {
    output_type: 'chat',
    input_type: 'text',
    input_value: 'Analyze flakiness across these two Playwright builds.',
    session_id: sessionIdFor(),
    tweaks: {
      [PROMPT_TEMPLATE_NODE_ID]: {
        file1: file1Content,
        file2: file2Content,
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LangflowError(
        'TIMEOUT',
        'The analysis took longer than expected. Please try again.',
      );
    }
    throw new LangflowError(
      'NETWORK_ERROR',
      'Unable to connect to the Flaky Test Analyzer service. Check that Langflow is running and try again.',
    );
  }

  if (!response.ok) {
    throw mapHttpError(response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new LangflowError(
      'INVALID_RESPONSE',
      'Langflow returned an unreadable response.',
    );
  }
}

function mapHttpError(status: number): LangflowError {
  switch (status) {
    case 400:
      return new LangflowError(
        'INVALID_INPUT',
        'Langflow rejected the analysis request. Verify the uploaded files are valid Playwright result.json files.',
      );
    case 401:
      return new LangflowError(
        'UNAUTHORIZED',
        'Langflow rejected the request. Check the configured API key.',
      );
    case 403:
      return new LangflowError(
        'FORBIDDEN',
        'Access to the Langflow workflow is forbidden.',
      );
    case 404:
      return new LangflowError(
        'NOT_FOUND',
        'The Langflow workflow could not be found. Verify the flow id in your environment configuration.',
      );
    case 408:
      return new LangflowError(
        'TIMEOUT',
        'The analysis took longer than expected. Please try again.',
        true,
      );
    case 429:
      return new LangflowError(
        'LANGFLOW_ERROR',
        'Langflow is rate-limiting requests. Please wait and retry.',
        true,
      );
    default:
      if (status >= 500) {
        return new LangflowError(
          'LANGFLOW_ERROR',
          'Langflow reported an internal error while analyzing the builds.',
          true,
        );
      }
      return new LangflowError(
        'LANGFLOW_ERROR',
        'Langflow could not analyze these builds.',
      );
  }
}

/**
 * Sends both Playwright result.json contents to the FlakyTest_AI_Agent
 * workflow and returns the raw Langflow response payload.
 *
 * Throws a LangflowError with a user-safe message on failure.
 */
export async function analyzeFlakyTests(
  build1Content: string,
  build2Content: string,
): Promise<unknown> {
  if (!build1Content.trim() || !build2Content.trim()) {
    throw new LangflowError(
      'INVALID_INPUT',
      'Both Build 1 and Build 2 must contain valid JSON before analysis.',
    );
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    return await requestAnalysis(build1Content, build2Content, controller.signal);
  } finally {
    window.clearTimeout(timer);
  }
}
