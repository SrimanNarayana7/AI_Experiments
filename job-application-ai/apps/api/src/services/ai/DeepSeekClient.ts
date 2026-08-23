import { z } from 'zod';
import { env } from '../../config';
import { logger } from '../../logger';

interface DeepSeekMessage {
  role: 'system' | 'user';
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class DeepSeekClientError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'DeepSeekClientError';
  }
}

export class DeepSeekClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private maxRetries: number;
  private circuitOpen = false;
  private consecutiveFailures = 0;
  private circuitThreshold = 5;

  constructor(
    baseUrl = env.DEEPSEEK_BASE_URL,
    apiKey = env.DEEPSEEK_API_KEY,
    model = env.DEEPSEEK_MODEL,
    timeoutMs = 60_000,
    maxRetries = 3,
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  async complete<T extends z.ZodType>(
    messages: DeepSeekMessage[],
    schema: T,
  ): Promise<z.infer<T>> {
    if (this.circuitOpen) {
      throw new DeepSeekClientError('Circuit breaker is open');
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.call(messages);
        const parsed = this.parseJson(result);
        const validated = schema.parse(parsed);
        this.consecutiveFailures = 0;
        return validated;
      } catch (error) {
        lastError = error instanceof Error ? error : new DeepSeekClientError(String(error));
        this.consecutiveFailures++;

        if (this.consecutiveFailures >= this.circuitThreshold) {
          this.circuitOpen = true;
          logger.error('Circuit breaker opened for DeepSeek');
          throw new DeepSeekClientError('Circuit breaker opened', lastError);
        }

        if (attempt < this.maxRetries) {
          const delay = Math.min(2 ** attempt * 1000, 10_000);
          logger.warn({ attempt, delay, error: lastError.message }, 'DeepSeek retry');
          await this.sleep(delay);
        }
      }
    }

    throw new DeepSeekClientError('DeepSeek request failed after retries', lastError);
  }

  private async call(messages: DeepSeekMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new DeepSeekClientError('DEEPSEEK_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        throw new DeepSeekClientError(`DeepSeek HTTP ${response.status}: ${text}`);
      }

      const data = (await response.json()) as DeepSeekResponse;
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new DeepSeekClientError('Empty response from DeepSeek');
      }

      return content;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof DeepSeekClientError) throw error;
      throw new DeepSeekClientError(
        error instanceof Error ? error.message : 'Unknown error',
        error,
      );
    }
  }

  private parseJson(content: string): unknown {
    const cleaned = content.replace(/^```json\s*|\s*```$/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      throw new DeepSeekClientError(
        `Failed to parse JSON response: ${cleaned.slice(0, 200)}`,
        error,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
