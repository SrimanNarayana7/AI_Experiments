import { config } from "../config.js";
import { extractInteractiveElements, renderElementList, type ProcessedDom } from "../dom/domProcessor.js";
import { chunkElements, renderBatchElementList, type DomBatch } from "../dom/domChunker.js";
import { estimateTokens } from "../dom/tokenEstimator.js";
import { analyzeViaLangflow } from "../langflow/analyze.js";
import { runBatches } from "../langflow/batchRunner.js";
import { LangflowError } from "../langflow/client.js";
import { getLlmClient, LlmApiError } from "../llm/index.js";
import { generateMockAnalysis } from "../llm/mockClient.js";
import { buildPageModel } from "../pom/pageModel.js";
import { ensurePageObjectClass } from "../pom/pomAssembler.js";
import { generateProject, type GeneratedFile, type ProjectSummary } from "../pom/projectGenerator.js";
import { buildProjectZip } from "../pom/zipExport.js";
import { buildSystemPrompt, buildUserPrompt, type AnalyzeRequest } from "../prompt/prompt.js";
import { isFramework, isLanguage, SUPPORTED_COMBINATIONS, type Framework, type Language } from "../types/stack.js";
import { fetchPageHtml, UrlFetchError } from "../url/urlFetch.js";
import { InvalidLlmResponseError, parseAndValidate } from "../validation/repair.js";
import type { ElementAnalysis, LocatorAnalysis } from "../validation/schema.js";
import { mergeBatchOutcomes } from "../analysis/merge.js";
import { createJob, getJob, updateJob, type AnalysisJobResult, type DomStats, type ProcessingInfo } from "../analysis/store.js";
import { validateAnalysisAgainstDom } from "../analysis/validateLocators.js";

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

export type RunAnalysisOutcome =
  | { kind: "sync"; analysisId: string; analysis: LocatorAnalysis; files: GeneratedFile[]; project: ProjectSummary; processing: ProcessingInfo; domStats: DomStats }
  | { kind: "async"; analysisId: string; processing: ProcessingInfo; domStats: DomStats };

export async function runAnalysis(request: AnalyzeRequest): Promise<RunAnalysisOutcome> {
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

  const plan = chunkElements(dom.elements);
  const processing: ProcessingInfo = {
    batched: plan.batched,
    batchCount: Math.max(plan.batches.length, 1),
    elementsExtracted: dom.elementCount,
    completedBatches: 0,
  };
  const domStats: DomStats = {
    htmlChars: html.length,
    estimatedTokens: estimateTokens(renderElementList(dom)),
  };

  if (plan.batched) {
    const job = createJob(processing, domStats);
    void runBatchedAnalysis(job.analysisId, plan.batches, request, dom, html, notes, sourceNote);
    return { kind: "async", analysisId: job.analysisId, processing, domStats };
  }

  const analysis = await analyzeSingle(request, renderElementList(dom), notes, sourceNote);
  const finalized = finalizeAnalysis(analysis, dom, html, request.framework, request.language, request.pageUrl, notes);
  const syncJob = createJob(processing, domStats);
  updateJob(syncJob, { status: "completed", result: finalized });
  return { kind: "sync", analysisId: syncJob.analysisId, ...finalized, processing, domStats };
}

export function getAnalysisState(analysisId: string) {
  const job = getJob(analysisId);
  if (!job) {
    throw new AnalysisError(404, "Analysis not found. It may have expired.");
  }
  return job;
}

export function getAnalysisZip(analysisId: string): { buffer: Buffer; projectName: string } {
  const job = getJob(analysisId);
  if (!job || !job.result) {
    throw new AnalysisError(404, "Analysis result not available.");
  }
  const buffer = buildProjectZip(job.result.files, "ai-locator-project");
  return { buffer, projectName: "ai-locator-project.zip" };
}

async function analyzeSingle(
  request: AnalyzeRequest,
  elementList: string,
  notes: string[],
  sourceNote: string,
): Promise<LocatorAnalysis> {
  if (config.llmProvider === "mock") {
    const userPrompt = buildUserPrompt(request, elementList, notes, sourceNote);
    return generateMockAnalysis(userPrompt, request.framework, request.language);
  }

  if (config.llmProvider === "langflow") {
    try {
      return await analyzeViaLangflow({
        framework: request.framework,
        language: request.language,
        elementList,
        warnings: notes,
        sourceNote,
      });
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

  try {
    return parseAndValidate(rawResponse);
  } catch (error) {
    if (error instanceof InvalidLlmResponseError) {
      try {
        const retry = await client.generate(
          buildSystemPrompt(),
          `${userPrompt}\n\nYour previous response was rejected: ${error.message}\nReturn ONLY a valid JSON object matching the schema exactly.`,
        );
        return parseAndValidate(retry);
      } catch (retryError) {
        throw new AnalysisError(
          502,
          `LLM returned invalid JSON twice: ${error.message}${retryError instanceof InvalidLlmResponseError ? ` Retry failed: ${retryError.message}` : ""}`,
        );
      }
    }
    throw error;
  }
}

async function analyzeBatch(batch: DomBatch, request: AnalyzeRequest, notes: string[], sourceNote: string): Promise<ElementAnalysis[]> {
  if (config.llmProvider === "mock") {
    const prompt = `Target: ${request.framework}/${request.language}\nSource: ${sourceNote}\n\nNormalized interactive elements (element index is the source order in the DOM):\n${renderBatchElementList(batch)}\n\nExtraction warnings:\n${notes.map((n) => `- ${n}`).join("\n") || "- none"}`;
    return generateMockAnalysis(prompt, request.framework, request.language).elements;
  }
  if (config.llmProvider === "langflow") {
    const analysis = await analyzeViaLangflow({
      framework: request.framework,
      language: request.language,
      elementList: renderBatchElementList(batch),
      warnings: notes,
      sourceNote,
      contextNote: batch.contextNote,
    });
    return analysis.elements;
  }
  const userPrompt = buildUserPrompt(request, renderBatchElementList(batch), notes, sourceNote);
  const raw = await getLlmClient().generate(buildSystemPrompt(), userPrompt);
  return parseAndValidate(raw).elements;
}

async function runBatchedAnalysis(
  analysisId: string,
  batches: DomBatch[],
  request: AnalyzeRequest,
  dom: ProcessedDom,
  html: string,
  notes: string[],
  sourceNote: string,
): Promise<void> {
  const job = getJob(analysisId);
  if (!job) return;
  try {
    if (config.llmProvider === "langflow") {
      const outcomes = await runBatches(batches, {
        framework: request.framework,
        language: request.language,
        warnings: notes,
        sourceNote,
        concurrency: config.batching.concurrency,
        onProgress: (completed, total) => {
          const current = getJob(analysisId);
          if (current) updateJob(current, { processing: { ...current.processing, completedBatches: completed } });
        },
      });
      const merged = mergeBatchOutcomes(outcomes, notes);
      const finalized = finalizeAnalysis(merged, dom, html, request.framework, request.language, request.pageUrl, notes);
      const current = getJob(analysisId);
      if (current) updateJob(current, { status: "completed", result: finalized });
    } else {
      const elements: ElementAnalysis[] = [];
      for (let i = 0; i < batches.length; i++) {
        const batchElements = await analyzeBatch(batches[i], request, notes, sourceNote);
        batchElements.forEach((el, j) => elements.push({ ...el, elementId: batches[i].elementIds[j] }));
        const current = getJob(analysisId);
        if (current) updateJob(current, { processing: { ...current.processing, completedBatches: i + 1 } });
      }
      const merged = mergeBatchOutcomes(
        batches.map((batch, i) => ({
          batch,
          elements: elements.filter((el) => batch.elementIds.includes(el.elementId!)),
          warnings: [],
          attempts: 1,
        })),
        notes,
      );
      const finalized = finalizeAnalysis(merged, dom, html, request.framework, request.language, request.pageUrl, notes);
      const current = getJob(analysisId);
      if (current) updateJob(current, { status: "completed", result: finalized });
    }
  } catch (error) {
    const current = getJob(analysisId);
    if (current) {
      updateJob(current, { status: "failed", error: error instanceof Error ? error.message : String(error) });
    }
  }
}

function pushNotes(analysis: LocatorAnalysis, notes: string[]): void {
  for (const note of notes) {
    if (!analysis.summary.warnings.includes(note)) {
      analysis.summary.warnings.push(note);
    }
  }
}

/** Deterministic post-processing shared by single-run and batched paths. */
function finalizeAnalysis(
  analysis: LocatorAnalysis,
  dom: ProcessedDom,
  html: string,
  framework: Framework,
  language: Language,
  pageUrl: string | undefined,
  notes: string[],
): AnalysisJobResult {
  const validated = validateAnalysisAgainstDom(analysis.elements, dom.elements, html);
  const highConfidence = validated.filter((el) => (el.finalScore ?? el.primary.score) >= 80).length;
  const avgScore =
    validated.length === 0
      ? 0
      : Math.round(validated.reduce((sum, el) => sum + (el.finalScore ?? el.primary.score), 0) / validated.length);
  const merged: LocatorAnalysis = {
    summary: { ...analysis.summary, elementsAnalyzed: validated.length, highConfidence, avgScore },
    elements: validated,
    pageObjectClass: analysis.pageObjectClass,
  };
  ensurePageObjectClass(merged, framework, language);
  pushNotes(merged, notes);

  const elementMap = new Map(validated.filter((el) => el.elementId).map((el) => [el.elementId!, el]));
  const pageModel = buildPageModel(dom.elements, pageUrl, language);
  const project = generateProject(pageModel, elementMap, merged, framework, language, pageUrl);

  return { analysis: merged, files: project.files, project: project.summary };
}
