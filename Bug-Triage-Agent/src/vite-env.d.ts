/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Langflow server origin, e.g. http://localhost:7860 */
  readonly VITE_LANGFLOW_BASE_URL?: string;
  /** Bug Triage workflow id in Langflow. */
  readonly VITE_LANGFLOW_FLOW_ID?: string;
  /**
   * Optional Langflow API key. Only intended for Langflow instances that are
   * configured for browser-safe authentication. For real secrets use
   * VITE_LANGFLOW_PROXY_URL instead so the key stays server-side.
   */
  readonly VITE_LANGFLOW_API_KEY?: string;
  /** Optional secure proxy that forwards to Langflow with the key server-side. */
  readonly VITE_LANGFLOW_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
