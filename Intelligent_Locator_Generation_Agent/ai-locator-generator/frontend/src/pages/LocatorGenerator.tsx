import { AnimatePresence, motion } from "framer-motion";
import { Braces, Check, CircleAlert, ScanSearch, Search, Sparkles } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { AnalysisSummary } from "../components/analysis/AnalysisSummary";
import { InsightList, type InsightFilter } from "../components/analysis/InsightList";
import { isStructuralStrategy, isTestAttributeStrategy } from "../components/analysis/StabilityScore";
import { JsonViewer } from "../components/code/JsonViewer";
import { PageObjectViewer } from "../components/code/PageObjectViewer";
import { Button } from "../components/common/Button";
import { Tabs } from "../components/common/Tabs";
import { DomEditor } from "../components/input/DomEditor";
import { InputToolbar } from "../components/input/InputToolbar";
import { UrlInput } from "../components/input/UrlInput";
import { LocatorCard } from "../components/locators/LocatorCard";
import { SAMPLE_HTML } from "../samples";
import {
  FRAMEWORK_LABELS,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type Framework,
  type Language,
} from "../types/locator";
import { PROGRESS_STEPS, useLocatorAnalysis, type AnalyzeInput } from "../hooks/useLocatorAnalysis";

type InputMode = "html" | "url";
type ResultTab = "overview" | "elements" | "pom" | "json";

interface LocatorGeneratorProps {
  framework: Framework;
  language: Language;
  onFrameworkChange: (framework: Framework) => void;
  onLanguageChange: (language: Language) => void;
}

const FILTER_LABELS: Record<InsightFilter, string> = {
  stable: "Highly stable",
  structural: "Structural selectors",
  needsTestid: "Needs data-testid",
};

export function LocatorGenerator({ framework, language, onFrameworkChange, onLanguageChange }: LocatorGeneratorProps) {
  const [mode, setMode] = useState<InputMode>("html");
  const [html, setHtml] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [tab, setTab] = useState<ResultTab>("overview");
  const [query, setQuery] = useState("");
  const [insightFilter, setInsightFilter] = useState<InsightFilter | null>(null);

  const { analysis, loading, error, elapsedMs, progressStep, analyze, clear } = useLocatorAnalysis();
  const resultsRef = useRef<HTMLDivElement>(null);

  const canRun = (mode === "html" && html.trim() !== "") || (mode === "url" && pageUrl.trim() !== "");

  const run = useCallback(
    async (overrides?: Partial<AnalyzeInput>) => {
      const input: AnalyzeInput = {
        html: mode === "html" ? html.trim() || undefined : undefined,
        pageUrl: mode === "url" ? pageUrl.trim() || undefined : undefined,
        framework,
        language,
        ...overrides,
      };
      await analyze(input);
      setTab("overview");
      setInsightFilter(null);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    },
    [mode, html, pageUrl, framework, language, analyze],
  );

  const filteredElements = useMemo(() => {
    if (!analysis) return [];
    const q = query.trim().toLowerCase();
    return analysis.elements.filter((el) => {
      if (insightFilter === "stable" && el.primary.score < 80) return false;
      if (insightFilter === "structural" && !isStructuralStrategy(el)) return false;
      if (
        insightFilter === "needsTestid" &&
        (isTestAttributeStrategy(el.primary.strategy) || el.primary.score >= 90)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        el.element.toLowerCase().includes(q) ||
        el.tag.toLowerCase().includes(q) ||
        el.primary.strategy.toLowerCase().includes(q) ||
        el.primary.locator.toLowerCase().includes(q)
      );
    });
  }, [analysis, query, insightFilter]);

  function switchLanguage(next: Language) {
    if (!analysis) return;
    onLanguageChange(next);
    void run({ language: next });
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-start gap-2"
      >
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Generate stable locators from your DOM
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Paste HTML or point at a page. The AI extracts every interactive element, ranks locator strategies by
          stability, and hands you a ready-to-use Page Object class.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* INPUT PANEL */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur"
          aria-label="DOM input"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">DOM Input</h3>
            <div className="inline-flex rounded-xl border border-line bg-elevated p-0.5" role="tablist" aria-label="Input mode">
              {(
                [
                  { id: "html", label: "HTML / DOM" },
                  { id: "url", label: "Page URL" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none ${
                    mode === m.id ? "bg-surface text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "html" ? (
            <DomEditor value={html} onChange={setHtml} onLoadSample={() => setHtml(SAMPLE_HTML)} />
          ) : (
            <UrlInput value={pageUrl} onChange={setPageUrl} onInspect={() => void run()} disabled={loading} />
          )}

          <InputToolbar
            framework={framework}
            language={language}
            loading={loading}
            canRun={canRun}
            onFrameworkChange={onFrameworkChange}
            onLanguageChange={onLanguageChange}
            onAnalyze={() => void run()}
          />
        </motion.section>

        {/* ANALYSIS PANEL */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur"
          aria-label="Analysis"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">Analysis</h3>

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4 rounded-2xl border border-danger/25 bg-danger/5 p-5"
              >
                <div className="flex items-start gap-3">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Unable to analyze DOM</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{error}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void run()}>
                    Retry
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clear();
                      setHtml("");
                      setPageUrl("");
                    }}
                  >
                    Clear input
                  </Button>
                </div>
              </motion.div>
            ) : loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3 py-6">
                {PROGRESS_STEPS.map((step, i) => {
                  const state = progressStep > i ? "done" : progressStep === i ? "active" : "pending";
                  return (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                          state === "done"
                            ? "border-success/40 bg-success/10 text-success"
                            : state === "active"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-line-strong text-faint"
                        }`}
                      >
                        {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className={`text-sm ${state === "pending" ? "text-faint" : "text-ink"}`}>{step}</span>
                      {state === "active" && <span className="shimmer h-3 w-24 rounded bg-line" />}
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : analysis ? (
              <motion.div key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                <AnalysisSummary summary={analysis.summary} elapsedMs={elapsedMs} />
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Insights</p>
                  <InsightList elements={analysis.elements} activeFilter={insightFilter} onFilter={setInsightFilter} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 py-10 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-elevated">
                  <ScanSearch className="h-7 w-7 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink">Turn your DOM into resilient locators</h4>
                  <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted">
                    Paste HTML or provide a page URL to generate stable automation selectors.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { setMode("html"); setHtml(SAMPLE_HTML); }}>
                  <Sparkles className="h-3.5 w-3.5" /> Load sample HTML
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>

      {/* RESULTS */}
      <div ref={resultsRef}>
        <AnimatePresence>
          {analysis && !error && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col gap-4"
              aria-label="Results"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                  tabs={[
                    { id: "overview", label: "Overview" },
                    { id: "elements", label: `Elements (${analysis.elements.length})` },
                    { id: "pom", label: "Page Object" },
                    { id: "json", label: "Raw JSON" },
                  ]}
                  active={tab}
                  onChange={(id) => setTab(id as ResultTab)}
                />
                {tab === "elements" && (
                  <div className="flex flex-wrap items-center gap-2">
                    {insightFilter && (
                      <button
                        onClick={() => setInsightFilter(null)}
                        className="rounded-lg border border-line-strong bg-elevated px-2.5 py-1 text-[11px] font-medium text-muted hover:text-ink"
                      >
                        {FILTER_LABELS[insightFilter]} ×
                      </button>
                    )}
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5">
                      <Search className="h-3.5 w-3.5 text-faint" />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter elements…"
                        aria-label="Filter elements"
                        className="w-44 bg-transparent text-xs text-ink outline-none placeholder:text-faint"
                      />
                    </div>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === "overview" && (
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <AnalysisSummary summary={analysis.summary} elapsedMs={elapsedMs} />
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Insights</p>
                        <InsightList elements={analysis.elements} activeFilter={insightFilter} onFilter={setInsightFilter} />
                      </div>
                      <div className="lg:col-span-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Top locators</p>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {[...analysis.elements]
                            .sort((a, b) => b.primary.score - a.primary.score)
                            .slice(0, 6)
                            .map((el, i) => (
                              <button
                                key={i}
                                onClick={() => { setTab("elements"); setQuery(el.element); }}
                                className="group rounded-2xl border border-line bg-surface/70 p-3 text-left transition-colors hover:border-line-strong"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-xs font-medium text-ink">{el.element}</span>
                                  <span className="text-[11px] tabular-nums text-muted">{el.primary.score}</span>
                                </div>
                                <code className="mono mt-1.5 block truncate text-[11px] text-faint group-hover:text-muted">
                                  {el.primary.locator}
                                </code>
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "elements" && (
                    <div className="flex flex-col gap-3">
                      {filteredElements.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
                          No elements match the current filter.
                        </p>
                      ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {filteredElements.map((el) => (
                            <LocatorCard
                              key={analysis.elements.indexOf(el)}
                              element={el}
                              index={analysis.elements.indexOf(el)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "pom" &&
                    (analysis.pageObjectClass ? (
                      <PageObjectViewer
                        pageObject={analysis.pageObjectClass}
                        languages={SUPPORTED_LANGUAGES[framework].map((lang) => ({ id: lang, label: LANGUAGE_LABELS[lang] }))}
                        activeLanguage={language}
                        onLanguageChange={(lang) => switchLanguage(lang as Language)}
                        onRegenerate={() => void run()}
                        regenerating={loading}
                      />
                    ) : (
                      <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
                        No Page Object class was generated.
                      </p>
                    ))}

                  {tab === "json" && <JsonViewer data={analysis} />}
                </motion.div>
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 pb-2 text-[11px] text-faint">
        <span>
          {FRAMEWORK_LABELS[framework]} · {LANGUAGE_LABELS[language]} · LangFlow pipeline
        </span>
        <span className="flex items-center gap-1.5">
          <Braces className="h-3 w-3" /> AI Locator Generator
        </span>
      </footer>
    </main>
  );
}
