import type { AnalyzeResponse, Framework, Language } from "../types/locator";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function analyzeLocators(input: {
  html?: string;
  pageUrl?: string;
  framework: Framework;
  language: Language;
}): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as AnalyzeResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.error ?? `Request failed with status ${response.status}.`);
  }
  return data;
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
