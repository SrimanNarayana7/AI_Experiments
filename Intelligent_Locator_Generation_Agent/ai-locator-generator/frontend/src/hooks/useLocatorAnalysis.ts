import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeLocators } from "../services/api";
import type { Framework, Language, LocatorAnalysis } from "../types/locator";

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

export function useLocatorAnalysis() {
  const [analysis, setAnalysis] = useState<LocatorAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!loading) return;
    const timers = PROGRESS_STEPS.map((_, index) =>
      window.setTimeout(() => setProgressStep(index + 1), (index + 1) * 2600),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [loading]);

  const analyze = useCallback(async (input: AnalyzeInput) => {
    const requestId = ++requestRef.current;
    setError(null);
    setLoading(true);
    setProgressStep(0);
    setElapsedMs(null);
    const started = performance.now();
    try {
      const response = await analyzeLocators(input);
      if (requestId !== requestRef.current) return;
      setAnalysis(response.analysis);
      setElapsedMs(Math.round(performance.now() - started));
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err instanceof Error ? err.message : "Unexpected error during analysis.");
      setAnalysis(null);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    requestRef.current++;
    setAnalysis(null);
    setError(null);
    setElapsedMs(null);
    setLoading(false);
  }, []);

  return { analysis, loading, error, elapsedMs, progressStep, analyze, clear };
}
