import "dotenv/config";

export type LlmProvider = "openai" | "anthropic" | "langflow" | "mock";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  llmProvider: (process.env.LLM_PROVIDER ?? "openai") as LlmProvider,
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
  },
  langflow: {
    baseUrl: process.env.LANGFLOW_BASE_URL ?? "http://localhost:7860",
    flowId: process.env.LANGFLOW_FLOW_ID ?? "",
    apiKey: process.env.LANGFLOW_API_KEY ?? "",
    timeoutMs: Number(process.env.LANGFLOW_TIMEOUT_MS ?? 120_000),
  },
  limits: {
    maxHtmlChars: 200_000,
    maxElements: 150,
    maxTokens: 4096,
  },
  batching: {
    // Token budget per LangFlow batch. Below this, a single run is used.
    maxTokensPerBatch: Number(process.env.BATCH_MAX_TOKENS ?? 6_000),
    // Hard cap on the number of batches; beyond this the per-batch budget grows.
    maxBatches: Number(process.env.BATCH_MAX_BATCHES ?? 12),
    // Concurrent LangFlow batch requests.
    concurrency: Number(process.env.BATCH_CONCURRENCY ?? 3),
    // Rough characters-per-token estimate used for budgeting.
    charsPerToken: 4,
  },
};
