import config from '../../config';
import type { BugTriageResult } from '../../types/triage';
import { normalizeLangflowResponse } from './normalize';
import { TriageError } from './errors';
import type { TriageResult } from './errors';

/**
 * langflowService — the only module that talks to Langflow.
 *
 * Responsibilities:
 * - Build the request for the existing Bug Triage workflow.
 * - Send the Jira issue key to Langflow.
 * - Handle HTTP errors and map them to human-readable failures.
 * - Normalize the raw Langflow response into a typed BugTriageResult.
 *
 * The UI never sees Langflow's internal response structure.
 */

export const LANGFLOW_RUN_PATH = '/api/v1/run';

/**
 * The Bug Triage workflow's API Request node hardcodes the Jira issue URL
 * (e.g. .../issue/KAN-13). The request `input_value` only reaches the prompt
 * text, so a different key would still fetch KAN-13. Langflow's `tweaks`
 * mechanism lets us override that node's URL at run time with the actual
 * issue the user entered.
 */
const API_REQUEST_NODE_ID = 'APIRequest-SSM1A';

/** Base Jira REST URL for the workflow's Jira instance. */
const JIRA_BASE_URL = 'https://sriman7.atlassian.net/rest/api/3/issue';

function sessionIdFor(issueKey: string): string {
  return `${issueKey}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildRunUrl(): string {
  if (config.proxyUrl) {
    return `${config.proxyUrl.replace(/\/+$/, '')}${LANGFLOW_RUN_PATH}/${config.flowId}`;
  }
  return `${config.baseUrl.replace(/\/+$/, '')}${LANGFLOW_RUN_PATH}/${config.flowId}?stream=false`;
}

async function requestTriage(issueKey: string, signal: AbortSignal): Promise<unknown> {
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
    input_value: issueKey,
    session_id: sessionIdFor(issueKey),
    tweaks: {
      [API_REQUEST_NODE_ID]: {
        url_input: `${JIRA_BASE_URL}/${issueKey}`,
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
      throw new TriageError('TIMEOUT', 'Langflow analysis timed out. Please try again.');
    }
    throw new TriageError(
      'NETWORK_ERROR',
      'Unable to reach the Langflow service. Check that it is running and try again.',
    );
  }

  if (!response.ok) {
    throw mapHttpError(response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new TriageError('INVALID_RESPONSE', 'Langflow returned an unreadable response.');
  }
}

function mapHttpError(status: number): TriageError {
  switch (status) {
    case 401:
      return new TriageError('UNAUTHORIZED', 'Langflow rejected the request. Check the configured API key.');
    case 403:
      return new TriageError('FORBIDDEN', 'Access to the Langflow workflow is forbidden.');
    case 404:
      return new TriageError(
        'NOT_FOUND',
        'The Langflow workflow or the Jira issue could not be found. Verify the flow id and issue key.',
      );
    case 408:
      return new TriageError('TIMEOUT', 'Langflow analysis timed out. Please try again.', true);
    case 429:
      return new TriageError('LANGFLOW_ERROR', 'Langflow is rate-limiting requests. Please wait and retry.', true);
    default:
      if (status >= 500) {
        return new TriageError(
          'LANGFLOW_ERROR',
          'Langflow reported an internal error while analyzing the issue.',
          true,
        );
      }
      return new TriageError('LANGFLOW_ERROR', 'Langflow could not analyze this issue.');
  }
}

/**
 * Runs the Bug Triage workflow for a Jira issue key and returns a typed
 * triage result. Throws a TriageError with a user-safe message on failure.
 */
export async function analyzeBug(issueKey: string): Promise<TriageResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const payload = await requestTriage(issueKey, controller.signal);
    const data: BugTriageResult = normalizeLangflowResponse(payload);
    return { data };
  } finally {
    window.clearTimeout(timer);
  }
}
