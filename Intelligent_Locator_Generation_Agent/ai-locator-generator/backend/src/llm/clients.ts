import { config } from "../config.js";

export interface LlmClient {
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export class LlmApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "LlmApiError";
    this.status = status;
  }
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 60_000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new LlmApiError(`LLM API error ${response.status}: ${text.slice(0, 500)}`, response.status);
    }
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof LlmApiError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new LlmApiError("LLM request timed out after 60 seconds.");
    }
    throw new LlmApiError(`Failed to reach LLM API: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export class OpenAiClient implements LlmClient {
  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!config.openai.apiKey) {
      throw new LlmApiError("OPENAI_API_KEY is not configured on the server.");
    }
    const data = await postJson(
      `${config.openai.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openai.apiKey}`,
      },
      {
        model: config.openai.model,
        temperature: 0.2,
        max_tokens: config.limits.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    );
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new LlmApiError("LLM returned an empty response.");
    }
    return content;
  }
}

export class AnthropicClient implements LlmClient {
  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!config.anthropic.apiKey) {
      throw new LlmApiError("ANTHROPIC_API_KEY is not configured on the server.");
    }
    const data = await postJson(
      "https://api.anthropic.com/v1/messages",
      {
        "Content-Type": "application/json",
        "x-api-key": config.anthropic.apiKey,
        "anthropic-version": "2023-06-01",
      },
      {
        model: config.anthropic.model,
        max_tokens: config.limits.maxTokens,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      },
    );
    const content = data?.content?.[0]?.text;
    if (typeof content !== "string" || content.length === 0) {
      throw new LlmApiError("LLM returned an empty response.");
    }
    return content;
  }
}
