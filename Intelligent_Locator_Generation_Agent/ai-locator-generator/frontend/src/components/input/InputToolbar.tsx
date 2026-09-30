import { Loader2, Sparkles } from "lucide-react";
import { Button } from "../common/Button";
import {
  FRAMEWORK_LABELS,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type Framework,
  type Language,
} from "../../types/locator";

interface InputToolbarProps {
  framework: Framework;
  language: Language;
  loading: boolean;
  canRun: boolean;
  onFrameworkChange: (framework: Framework) => void;
  onLanguageChange: (language: Language) => void;
  onAnalyze: () => void;
}

export function InputToolbar({
  framework,
  language,
  loading,
  canRun,
  onFrameworkChange,
  onLanguageChange,
  onAnalyze,
}: InputToolbarProps) {
  function handleFrameworkChange(next: Framework) {
    onFrameworkChange(next);
    if (!SUPPORTED_LANGUAGES[next].includes(language)) {
      onLanguageChange(SUPPORTED_LANGUAGES[next][0]);
    }
  }

  const selectClass =
    "rounded-xl border border-line-strong bg-elevated px-3 py-1.5 text-xs font-medium text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-faint">Framework</span>
            <select
              value={framework}
              onChange={(e) => handleFrameworkChange(e.target.value as Framework)}
              aria-label="Framework"
              className={selectClass}
            >
              {(Object.keys(SUPPORTED_LANGUAGES) as Framework[]).map((fw) => (
                <option key={fw} value={fw}>
                  {FRAMEWORK_LABELS[fw]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-faint">Language</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              aria-label="Language"
              className={selectClass}
            >
              {SUPPORTED_LANGUAGES[framework].map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={onAnalyze}
        disabled={loading || !canRun}
        className={`relative w-full overflow-hidden ${loading ? "shimmer" : ""}`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analyzing DOM…" : "Analyze DOM"}
      </Button>
    </div>
  );
}
