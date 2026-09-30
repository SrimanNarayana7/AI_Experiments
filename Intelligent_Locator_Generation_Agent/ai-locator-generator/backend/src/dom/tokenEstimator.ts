/**
 * Lightweight token estimation. Uses the standard ~4 chars per token
 * heuristic — good enough for context budgeting, no model-specific
 * tokenizer dependency.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateBatchTokens(renderedElementList: string, contextNote: string, promptOverhead = 800): number {
  return estimateTokens(renderedElementList + contextNote) + promptOverhead;
}
