import { config } from "../config.js";
import { extractInteractiveElements, renderElementList } from "../dom/domProcessor.js";
import { analyzeViaLangflow } from "../langflow/analyze.js";
import { LangflowError } from "../langflow/client.js";
import { getLlmClient, LlmApiError } from "../llm/index.js";
import { generateMockAnalysis } from "../llm/mockClient.js";
import { ensurePageObjectClass } from "../pom/pomAssembler.js";
import { buildSystemPrompt, buildUserPrompt, type AnalyzeRequest } from "../prompt/prompt.js";
import { isFramework, isLanguage, SUPPORTED_COMBINATIONS } from "../types/stack.js";
import { fetchPageHtml, UrlFetchError } from "../url/urlFetch.js";
import { InvalidLlmResponseError, parseAndValidate } from "../validation/repair.js";
import type { LocatorAnalysis } from "../validation/schema.js";

function pushNotes(analysis: LocatorAnalysis, notes: string[]): void {
  for (const note of notes) {
    if (!analysis.summary.warnings.includes(note)) {
      analysis.summary.warnings.push(note);
    }
  }
}

export class AnalysisError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AnalysisError";
    this.status = status;
  }
}

export function validateRequest(body: unknown): AnalyzeRequest {
  const raw = (body ?? {}) as Record<string, unknown>;
  const html = typeof raw.html === "string" ? raw.html.trim() : "";
  const pageUrl = typeof raw.pageUrl === "string" ? raw.pageUrl.trim() : "";
  const framework = raw.framework;
  const language = raw.language;

  if (!html && !pageUrl) {
    throw new AnalysisError(400, "Provide either raw HTML or a page URL.");
  }
  if (html && pageUrl) {
    throw new AnalysisError(400, "Provide either raw HTML or a page URL, not both.");
  }
  if (!isFramework(framework) || !isLanguage(language)) {
    throw new AnalysisError(400, "Unsupported framework or language.");
  }
  if (!SUPPORTED_COMBINATIONS[framework].includes(language)) {
    throw new AnalysisError(
      400,
      `Framework "${framework}" does not support "${language}". Supported: ${SUPPORTED_COMBINATIONS[framework].join(", ")}.`,
    );
  }
  if (html.length > config.limits.maxHtmlChars) {
    throw new AnalysisError(413, `HTML exceeds the ${config.limits.maxHtmlChars.toLocaleString()} character limit.`);
  }
  return { html: html || undefined, pageUrl: pageUrl || undefined, framework, language };
}

export async function runAnalysis(request: AnalyzeRequest): Promise<{ analysis: LocatorAnalysis; notes: string[] }> {
  const notes: string[] = [];
  let html = request.html ?? "";
  let sourceNote = "raw HTML supplied by the user";

  if (!html && request.pageUrl) {
    const page = await fetchPageHtml(request.pageUrl);
    html = page.html;
    sourceNote = `static HTML fetched from ${request.pageUrl}`;
    notes.push(page.note);
  }

  if (!/<\/?[a-z][^>]*>/i.test(html)) {
    throw new AnalysisError(400, "Input does not look like HTML. Paste a full HTML snippet or DOM markup.");
  }

  const dom = extractInteractiveElements(html, config.limits.maxElements);
  if (dom.elementCount === 0) {
    throw new AnalysisError(
      422,
      "No interactive elements found. Paste HTML that contains buttons, links, inputs, selects, or textareas.",
    );
  }
  if (dom.truncated) {
    notes.push(`DOM limited to the first ${config.limits.maxElements} interactive elements.`);
  }
  if (dom.hadNoiseRemoved) {
    notes.push("Scripts, styles, and non-interactive markup were stripped before analysis.");
  }

  const elementList = renderElementList(dom);

  if (config.llmProvider === "mock") {
    const userPrompt = buildUserPrompt(request, elementList, notes, sourceNote);
    const analysis = generateMockAnalysis(userPrompt, request.framework, request.language);
    ensurePageObjectClass(analysis, request.framework, request.language);
    pushNotes(analysis, notes);
    return { analysis, notes };
  }

  if (config.llmProvider === "langflow") {
    try {
      const analysis = await analyzeViaLangflow({
        framework: request.framework,
        language: request.language,
        elementList,
        warnings: notes,
        sourceNote,
      });
      ensurePageObjectClass(analysis, request.framework, request.language);
      pushNotes(analysis, notes);
      return { analysis, notes };
    } catch (error) {
      if (error instanceof LangflowError) {
        throw new AnalysisError(502, `LangFlow failure: ${error.message}`);
      }
      throw error;
    }
  }

  const userPrompt = buildUserPrompt(request, elementList, notes, sourceNote);

  const client = getLlmClient();
  let rawResponse: string;
  try {
    rawResponse = await client.generate(buildSystemPrompt(), userPrompt);
  } catch (error) {
    if (error instanceof LlmApiError) {
      throw new AnalysisError(502, `LLM API failure: ${error.message}`);
    }
    throw new AnalysisError(502, `LLM call failed: ${(error as Error).message}`);
  }

  let analysis: LocatorAnalysis;
  try {
    analysis = parseAndValidate(rawResponse);
  } catch (error) {
    if (error instanceof InvalidLlmResponseError) {
      try {
        const retry = await client.generate(
          buildSystemPrompt(),
          `${userPrompt}\n\nYour previous response was rejected: ${error.message}\nReturn ONLY a valid JSON object matching the schema exactly.`,
        );
        analysis = parseAndValidate(retry);
      } catch (retryError) {
        throw new AnalysisError(
          502,
          `LLM returned invalid JSON twice: ${error.message}${retryError instanceof InvalidLlmResponseError ? ` Retry failed: ${retryError.message}` : ""}`,
        );
      }
    } else {
      throw error;
    }
  }

  ensurePageObjectClass(analysis, request.framework, request.language);
  pushNotes(analysis, notes);
  return { analysis, notes };
}
