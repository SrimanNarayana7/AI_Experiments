import { config } from "../config.js";
import { AnthropicClient, OpenAiClient, type LlmClient } from "./clients.js";

export function getLlmClient(): LlmClient {
  switch (config.llmProvider) {
    case "anthropic":
      return new AnthropicClient();
    case "mock":
      // Handled separately in the analysis service; not a real client.
      return new OpenAiClient();
    case "openai":
    default:
      return new OpenAiClient();
  }
}

export { LlmApiError, type LlmClient } from "./clients.js";
