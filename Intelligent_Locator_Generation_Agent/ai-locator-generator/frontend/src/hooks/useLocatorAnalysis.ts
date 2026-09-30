import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeLocators, pollAnalysis } from "../services/api";
import type {
  AnalysisState,
  DomStats,
  Framework,
  GeneratedFile,
  Language,
  LocatorAnalysis,
  ProcessingInfo,
  ProjectSummary,
} from "../types/locator";

export const PROGRESS_STEPS = [
  "Parsing DOM",
  "Identifying interactive elements",
  "Evaluating locator strategies",
  "Calculating stability",
  "Generating Page Object",
];

export interface AnalyzeInput {
  html?: string;
  pageUrl?: string;
  framework: Framework;
  language: Language;
}

const IDLE_PROCESSING: ProcessingInfo = {
  batched: false,
  batchCount: 1,
  elementsExtracted: 0,
  completedBatches: 0,
};

export function useLocatorAnalysis() {
  const [analysis, setAnalysis] = useState<LocatorAnalysis | null>(null);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [processing, setProcessing] = useState<ProcessingInfo>(IDLE_PROCESSING);
  const [domStats, setDomStats] = useState<DomStats | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!loading || processing.batched) return;
    const timers = PROGRESS_STEPS.map((_, index) =>
      window.setTimeout(() => setProgressStep(index + 1), (index + 1) * 2600),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [loading, processing.batched]);

  const analyze = useCallback(async (input: AnalyzeInput) => {
    const requestId = ++requestRef.current;
    setError(null);
    setLoading(true);
    setProgressStep(0);
    setElapsedMs(null);
    setProcessing(IDLE_PROCESSING);
    setDomStats(null);
    setAnalysisId(null);
    const started = performance.now();

    try {
      const result = await analyzeLocators(input);
      if (requestId !== requestRef.current) return;

      if ("analysis" in result) {
        setAnalysis(result.analysis);
        setFiles(result.files);
        setProject(result.project);
        setProcessing(result.processing);
        setDomStats(result.domStats);
        setAnalysisId(result.analysisId);
        setElapsedMs(Math.round(performance.now() - started));
      } else {
        setProcessing(result.processing);
        setDomStats(result.domStats);
        setAnalysisId(result.analysisId);
        await pollUntilDone(result.analysisId, (state) => {
          setProcessing(state.processing);
        });
        if (requestId !== requestRef.current) return;
        const finalState = await pollAnalysis(result.analysisId);
        if (finalState.status === "failed") {
          throw new Error(finalState.error ?? "Batch analysis failed.");
        }
        if (!finalState.analysis) throw new Error("Analysis completed without a result.");
        setAnalysis(finalState.analysis);
        setFiles(finalState.files ?? []);
        setProject(finalState.project ?? null);
        setDomStats(finalState.domStats);
        setElapsedMs(Math.round(performance.now() - started));
      }
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err instanceof Error ? err.message : "Unexpected error during analysis.");
      setAnalysis(null);
      setFiles([]);
      setProject(null);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    requestRef.current++;
    setAnalysis(null);
    setFiles([]);
    setProject(null);
    setError(null);
    setElapsedMs(null);
    setLoading(false);
    setProcessing(IDLE_PROCESSING);
    setDomStats(null);
    setAnalysisId(null);
  }, []);

  return {
    analysis,
    files,
    project,
    processing,
    domStats,
    analysisId,
    loading,
    error,
    elapsedMs,
    progressStep,
    analyze,
    clear,
  };
}

async function pollUntilDone(
  analysisId: string,
  onProgress: (state: AnalysisState) => void,
): Promise<void> {
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const state = await pollAnalysis(analysisId);
    onProgress(state);
    if (state.status !== "processing") return;
  }
}
