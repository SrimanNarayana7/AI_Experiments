/**
 * Runtime configuration.
 *
 * Values come from Vite environment variables at build/serve time. All of
 * these are non-secret, browser-safe configuration:
 *
 * - VITE_LANGFLOW_API_URL  — Langflow server origin (e.g. http://localhost:7860)
 * - VITE_LANGFLOW_FLOW_ID  — the exported FlakyTest_AI_Agent workflow id
 * - VITE_LANGFLOW_API_KEY  — optional key. Only set this if your Langflow
 *   instance is configured with a browser-safe API key. If the key is a real
 *   secret, leave it out and use VITE_LANGFLOW_PROXY_URL instead.
 * - VITE_LANGFLOW_PROXY_URL — optional secure proxy base URL that forwards to
 *   Langflow while keeping the API key server-side.
 * - VITE_LANGFLOW_TIMEOUT_MS — analysis timeout in milliseconds.
 */

function readEnv(name: string): string | undefined {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readEnvNumber(name: string, fallback: number): number {
  const value = readEnv(name);
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface LangflowConfig {
  /** Base URL of the Langflow server, e.g. `http://localhost:7860`. */
  baseUrl: string;
  /** Id of the FlakyTest_AI_Agent workflow to run. */
  flowId: string;
  /** Browser-safe API key, or undefined when a proxy is used. */
  apiKey: string | undefined;
  /** Optional secure proxy base URL (keeps the API key server-side). */
  proxyUrl: string | undefined;
  /** Request timeout in milliseconds. */
  timeoutMs: number;
}

const config: LangflowConfig = {
  baseUrl: readEnv('VITE_LANGFLOW_API_URL') ?? 'http://localhost:7860',
  flowId: readEnv('VITE_LANGFLOW_FLOW_ID') ?? '6bf6a234-da40-4dd7-8afd-8750d705e8ce',
  apiKey: readEnv('VITE_LANGFLOW_API_KEY'),
  proxyUrl: readEnv('VITE_LANGFLOW_PROXY_URL'),
  timeoutMs: readEnvNumber('VITE_LANGFLOW_TIMEOUT_MS', 120_000),
};

export default config;
