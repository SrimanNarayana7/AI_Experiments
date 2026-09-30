import { config } from "../config.js";
import type { ProcessedElement } from "./domProcessor.js";
import { estimateBatchTokens } from "./tokenEstimator.js";

export interface DomBatch {
  batchId: string;
  elementIds: string[];
  elements: ProcessedElement[];
  contextNote: string;
  estimatedTokens: number;
}

export interface ChunkPlan {
  batched: boolean;
  batches: DomBatch[];
  totalTokens: number;
}

/**
 * Split extracted elements into context-aware batches. Splitting happens on
 * element boundaries (never raw character ranges), preserves source order,
 * keeps related controls (same form/section) together, and never exceeds the
 * configured batch count by growing the per-batch budget instead.
 */
export function chunkElements(elements: ProcessedElement[]): ChunkPlan {
  const budget = config.batching.maxTokensPerBatch;
  const maxBatches = Math.max(1, config.batching.maxBatches);

  let batches: DomBatch[] = [];
  let current: ProcessedElement[] = [];

  const renderLine = (el: ProcessedElement): string => {
    const attrs = Object.entries(el.attributes)
      .map(([k, v]) => `${k}="${v.replace(/"/g, "&quot;")}"`)
      .join(" ");
    return `[${el.index}] <${el.tag} ${attrs}>${el.text ? ` ${el.text}` : ""}`;
  };

  const contextNoteFor = (els: ProcessedElement[]): string => {
    const forms = [...new Set(els.map((e) => e.context.form).filter(Boolean))] as string[];
    const sections = [...new Set(els.map((e) => e.context.section).filter(Boolean))] as string[];
    const containers = [...new Set(els.map((e) => e.context.container).filter(Boolean))] as string[];
    const parts: string[] = [];
    if (forms.length > 0) parts.push(`form(s): ${forms.join(", ")}`);
    if (sections.length > 0) parts.push(`section(s): ${sections.slice(0, 3).join(", ")}`);
    if (containers.length > 0) parts.push(`container(s): ${containers.join(", ")}`);
    return parts.length > 0 ? `Element context: ${parts.join("; ")}.` : "Element context: main content.";
  };

  const flush = () => {
    if (current.length === 0) return;
    const note = contextNoteFor(current);
    batches.push({
      batchId: `batch-${String(batches.length + 1).padStart(2, "0")}`,
      elementIds: current.map((el) => el.elementId),
      elements: current,
      contextNote: note,
      estimatedTokens: estimateBatchTokens(current.map(renderLine).join("\n"), note),
    });
    current = [];
  };

  for (const el of elements) {
    current.push(el);
    const tentativeTokens = estimateBatchTokens(current.map(renderLine).join("\n"), contextNoteFor(current));
    const nextWouldOverflow = tentativeTokens > budget;
    const last = current[current.length - 1]?.context ?? {};
    const prev = current[current.length - 2]?.context ?? {};
    const keepTogether =
      current.length >= 2 && ((last.form !== undefined && last.form === prev.form) || (last.section !== undefined && last.section === prev.section));
    if (nextWouldOverflow && current.length > 1 && !keepTogether) {
      current.pop();
      flush();
      current = [el];
    }
  }
  flush();

  if (batches.length > maxBatches) {
    // Merge smallest adjacent batches until within the max batch count.
    while (batches.length > maxBatches) {
      let mergeAt = 0;
      let minCost = Number.POSITIVE_INFINITY;
      for (let i = 0; i < batches.length - 1; i++) {
        const cost = batches[i].estimatedTokens + batches[i + 1].estimatedTokens;
        if (cost < minCost) {
          minCost = cost;
          mergeAt = i;
        }
      }
      const left = batches[mergeAt];
      const right = batches[mergeAt + 1];
      const mergedElements = [...left.elements, ...right.elements];
      const note = contextNoteFor(mergedElements);
      batches.splice(mergeAt, 2, {
        batchId: left.batchId,
        elementIds: mergedElements.map((el) => el.elementId),
        elements: mergedElements,
        contextNote: note,
        estimatedTokens: estimateBatchTokens(mergedElements.map(renderLine).join("\n"), note),
      });
    }
  }

  const totalTokens = batches.reduce((sum, b) => sum + b.estimatedTokens, 0);
  return { batched: batches.length > 1, batches, totalTokens };
}

/** Render a batch's elements as the LangFlow elementList payload. */
export function renderBatchElementList(batch: DomBatch): string {
  return batch.elements
    .map((el) => {
      const attrs = Object.entries(el.attributes)
        .map(([k, v]) => `${k}="${v.replace(/"/g, "&quot;")}"`)
        .join(" ");
      return `[${el.index}] <${el.tag} ${attrs}>${el.text ? ` ${el.text}` : ""}`;
    })
    .join("\n");
}
