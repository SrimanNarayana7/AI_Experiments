import type { AnalysisState, AnalyzeResult, Framework, Language } from "../types/locator";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function analyzeLocators(input: {
  html?: string;
  pageUrl?: string;
  framework: Framework;
  language: Language;
}): Promise<AnalyzeResult> {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as (AnalyzeResult & { success?: boolean; error?: string }) | undefined;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? `Request failed with status ${response.status}.`);
  }
  return data as AnalyzeResult;
}

export async function pollAnalysis(analysisId: string): Promise<AnalysisState> {
  const response = await fetch(`${API_BASE}/api/analyze/${analysisId}`);
  const data = (await response.json()) as AnalysisState & { success?: boolean; error?: string };
  if (!response.ok || !data.success) {
    throw new Error(data.error ?? `Polling failed with status ${response.status}.`);
  }
  return data;
}

export async function downloadProjectZip(analysisId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/analyze/${analysisId}/download`);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}.`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ai-locator-project.zip";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function checkHealth(): Promise<{ ok: boolean; provider: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = (await response.json()) as { status: string; provider: string };
    return { ok: data.status === "ok", provider: data.provider };
  } catch {
    return { ok: false, provider: "unknown" };
  }
}
