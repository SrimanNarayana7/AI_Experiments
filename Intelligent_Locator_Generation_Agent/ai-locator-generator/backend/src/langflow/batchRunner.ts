import type { DomBatch } from "../dom/domChunker.js";
import { renderBatchElementList } from "../dom/domChunker.js";
import { analyzeViaLangflow } from "./analyze.js";
import type { ElementAnalysis } from "../validation/schema.js";

export interface BatchOutcome {
  batch: DomBatch;
  elements: ElementAnalysis[];
  warnings: string[];
  attempts: number;
}

interface BatchRunnerOptions {
  framework: string;
  language: string;
  warnings: string[];
  sourceNote: string;
  concurrency: number;
  onProgress?: (completed: number, total: number, batchId: string) => void;
}

async function runOne(batch: DomBatch, options: BatchRunnerOptions): Promise<BatchOutcome> {
  const lastError = new Error("batch failed");
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const analysis = await analyzeViaLangflow({
        framework: options.framework,
        language: options.language,
        elementList: renderBatchElementList(batch),
        warnings: options.warnings,
        sourceNote: options.sourceNote,
        contextNote: batch.contextNote,
      });
      return { batch, elements: analysis.elements, warnings: analysis.summary.warnings, attempts: attempt };
    } catch (error) {
      lastError.message = error instanceof Error ? error.message : String(error);
    }
  }
  // Both attempts failed: rethrow so the caller can report/retry the batch.
  throw new Error(`Batch ${batch.batchId} failed after 2 attempts: ${lastError.message}`);
}

/**
 * Run LangFlow analysis for all batches, bounded concurrency, one retry per
 * batch. Failed batches throw so callers can retry just those batches.
 */
export async function runBatches(batches: DomBatch[], options: BatchRunnerOptions): Promise<BatchOutcome[]> {
  const results: BatchOutcome[] = [];
  const queue = [...batches];
  let completed = 0;

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const batch = queue.shift();
      if (!batch) return;
      const outcome = await runOne(batch, options);
      results.push(outcome);
      completed++;
      options.onProgress?.(completed, batches.length, batch.batchId);
    }
  };

  await Promise.all(Array.from({ length: Math.min(options.concurrency, batches.length) }, () => worker()));

  results.sort((a, b) => a.batch.batchId.localeCompare(b.batch.batchId));
  return results;
}
