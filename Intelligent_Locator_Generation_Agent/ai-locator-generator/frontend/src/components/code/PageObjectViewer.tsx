import { AnimatePresence, motion } from "framer-motion";
import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { PageObjectClass } from "../../types/locator";
import { Button } from "../common/Button";
import { CodeViewer } from "./CodeViewer";

const EXTENSIONS: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  java: "java",
  python: "py",
  csharp: "cs",
};

interface PageObjectViewerProps {
  pageObject: PageObjectClass;
  languages: { id: string; label: string }[];
  activeLanguage: string;
  onLanguageChange: (language: string) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export function PageObjectViewer({
  pageObject,
  languages,
  activeLanguage,
  onLanguageChange,
  onRegenerate,
  regenerating,
}: PageObjectViewerProps) {
  const [lastCode, setLastCode] = useState(pageObject.code);
  useEffect(() => {
    if (!regenerating) setLastCode(pageObject.code);
  }, [pageObject.code, regenerating]);

  function download() {
    const ext = EXTENSIONS[pageObject.language.toLowerCase()] ?? "txt";
    const filename = `${pageObject.name || "PageObject"}.${ext}`;
    const blob = new Blob([pageObject.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="Page Object language">
            {languages.map((lang) => (
              <button
                key={lang.id}
                role="tab"
                aria-selected={lang.id === activeLanguage}
                onClick={() => onLanguageChange(lang.id)}
                className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none ${
                  lang.id === activeLanguage ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {lang.id === activeLanguage && (
                  <motion.span
                    layoutId="pom-lang-pill"
                    className="absolute inset-0 rounded-lg border border-line-strong bg-elevated"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative z-10">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onRegenerate} disabled={regenerating}>
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Regenerating…" : "Regenerate"}
          </Button>
          <Button variant="secondary" size="sm" onClick={download}>
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${pageObject.language}-${regenerating ? "loading" : "ready"}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {regenerating ? (
            <div className="flex h-64 flex-col gap-2 rounded-2xl border border-line bg-editor p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="shimmer h-4 rounded bg-line" style={{ width: `${90 - i * 12}%` }} />
              ))}
            </div>
          ) : (
            <CodeViewer
              code={lastCode}
              filename={`${pageObject.name || "PageObject"}.${EXTENSIONS[pageObject.language.toLowerCase()] ?? "txt"}`}
              stickyHeader
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
