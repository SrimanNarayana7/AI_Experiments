import { z } from 'zod';

export const GenerationResultSchema = z.object({
  framework: z.enum(['playwright', 'restassured', 'karate', 'supertest']),
  projectName: z.string().min(1),
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
      }),
    )
    .min(1),
  scenarios: z.array(z.unknown()),
  coverage: z.object({
    endpointCoverage: z.number().min(0).max(100),
    responseCoverage: z.number().min(0).max(100),
    boundaryCoverage: z.number().min(0).max(100),
    schemaCoverage: z.number().min(0).max(100),
  }),
  warnings: z.array(z.string()).default([]),
});

export type GenerationResult = z.infer<typeof GenerationResultSchema>;

function extractJson(value: string): unknown {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1] ?? '');
    } catch {
      // fall through
    }
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

export interface ValidateOutputResult {
  valid: boolean;
  result?: GenerationResult;
  error?: string;
}

export function validateLlmOutput(payload: unknown): ValidateOutputResult {
  // Langflow run responses nest the chat message deeply. Extract any string.
  let text: string | undefined;
  const visit = (node: unknown): void => {
    if (text !== undefined) return;
    if (typeof node === 'string') {
      text = node;
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === 'object' && node !== null) {
      const obj = node as Record<string, unknown>;
      if (typeof obj.text === 'string') {
        text = obj.text;
        return;
      }
      if (typeof obj.content === 'string') {
        text = obj.content;
        return;
      }
      for (const value of Object.values(obj)) visit(value);
    }
  };

  visit(payload);

  if (!text) {
    return { valid: false, error: 'No text content found in Langflow response.' };
  }

  const json = extractJson(text);
  if (json === undefined) {
    return { valid: false, error: 'Langflow response is not valid JSON.' };
  }

  const parsed = GenerationResultSchema.safeParse(json);
  if (!parsed.success) {
    return { valid: false, error: parsed.error.message };
  }
  return { valid: true, result: parsed.data };
}
