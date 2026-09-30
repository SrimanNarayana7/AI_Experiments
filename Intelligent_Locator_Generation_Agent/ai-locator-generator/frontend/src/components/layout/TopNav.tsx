import { Moon, ScanSearch, Sun } from "lucide-react";
import { StatusIndicator } from "../common/StatusIndicator";
import { Tooltip } from "../common/Tooltip";
import {
  FRAMEWORK_LABELS,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type Framework,
  type Language,
} from "../../types/locator";

interface TopNavProps {
  backend: { ok: boolean; provider: string };
  framework: Framework;
  language: Language;
  theme: "dark" | "light";
  onFrameworkChange: (framework: Framework) => void;
  onLanguageChange: (language: Language) => void;
  onToggleTheme: () => void;
}

export function TopNav({
  backend,
  framework,
  language,
  theme,
  onFrameworkChange,
  onLanguageChange,
  onToggleTheme,
}: TopNavProps) {
  function handleFrameworkChange(next: Framework) {
    onFrameworkChange(next);
    if (!SUPPORTED_LANGUAGES[next].includes(language)) {
      onLanguageChange(SUPPORTED_LANGUAGES[next][0]);
    }
  }

  const selectClass =
    "rounded-xl border border-line-strong bg-elevated px-3 py-1.5 text-xs font-medium text-ink shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-deep text-white shadow-[0_4px_16px_-4px_rgba(99,102,241,0.6)]">
            <ScanSearch className="h-4.5 w-4.5" strokeWidth={2} />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-ink">AI Locator Generator</h1>
              <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline">
                AI-powered test automation
              </span>
            </div>
            <p className="text-[11px] text-faint">Stable locators from raw DOM</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusIndicator ok={backend.ok} label={backend.ok ? backend.provider : undefined} />

          <div className="flex items-center gap-2">
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

          <Tooltip content={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <button
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              className="rounded-xl border border-line-strong bg-elevated p-2 text-muted transition-colors hover:text-ink"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
