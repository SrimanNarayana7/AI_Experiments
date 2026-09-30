import type { LocatorAnalysis } from "../validation/schema.js";
import { parseAndValidate, InvalidLlmResponseError } from "../validation/repair.js";
import { LangflowError, runLangflow } from "./client.js";

export interface LangflowAnalysisInput {
  framework: string;
  language: string;
  elementList: string;
  warnings: string[];
  sourceNote: string;
  contextNote?: string;
}

export async function analyzeViaLangflow(input: LangflowAnalysisInput): Promise<LocatorAnalysis> {
  const payload = {
    framework: input.framework,
    language: input.language,
    elementList: input.elementList,
    warnings: input.warnings,
    sourceNote: input.sourceNote,
    contextNote: input.contextNote ?? "",
  };

  const response = await runLangflow(JSON.stringify(payload));

  const text = extractText(response.output);
  if (!text) {
    throw new LangflowError("INVALID_RESPONSE", "No text content found in Langflow response.");
  }

  try {
    return parseAndValidate(text);
  } catch (error) {
    if (error instanceof InvalidLlmResponseError) {
      throw new LangflowError("INVALID_RESPONSE", error.message);
    }
    throw error;
  }
}

function extractText(payload: unknown): string | undefined {
  // Prefer the chat message produced by the flow's final output node:
  // outputs[0].outputs[0].results.message.text. Walking blindly would pick
  // up unrelated strings (session id, sender name) first.
  let messageText: string | undefined;
  const findMessage = (node: unknown): void => {
    if (messageText !== undefined) return;
    if (Array.isArray(node)) {
      for (const item of node) findMessage(item);
      return;
    }
    if (typeof node === "object" && node !== null) {
      const obj = node as Record<string, unknown>;
      if (obj.results && typeof obj.results === "object") {
        const message = (obj.results as Record<string, unknown>).message;
        if (message && typeof message === "object") {
          const text = (message as Record<string, unknown>).text;
          if (typeof text === "string" && text.trim() !== "") {
            messageText = text;
            return;
          }
        }
      }
      for (const value of Object.values(obj)) findMessage(value);
    }
  };
  findMessage(payload);
  if (messageText !== undefined) return messageText;

  let text: string | undefined;
  const visit = (node: unknown): void => {
    if (text !== undefined) return;
    if (typeof node === "string") {
      text = node;
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === "object" && node !== null) {
      const obj = node as Record<string, unknown>;
      if (typeof obj.text === "string" && obj.text.trim() !== "") {
        text = obj.text;
        return;
      }
      if (typeof obj.content === "string" && obj.content.trim() !== "") {
        text = obj.content;
        return;
      }
      for (const value of Object.values(obj)) visit(value);
    }
  };
  visit(payload);
  return text;
}
