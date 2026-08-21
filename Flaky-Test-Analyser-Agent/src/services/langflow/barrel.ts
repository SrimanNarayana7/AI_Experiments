/**
 * Langflow integration for the FlakyTest_AI_Agent workflow.
 *
 * Public surface: analyzeFlakyTests (raw payload) and normalizeLangflowResponse
 * (typed AnalysisResult). Components should use the useFlakyTestAnalysis hook
 * rather than calling these directly.
 */

export { analyzeFlakyTests } from './index';
export { normalizeLangflowResponse } from './normalize';
export { LangflowError } from './errors';
export type { LangflowErrorCode, LangflowResult } from './errors';
