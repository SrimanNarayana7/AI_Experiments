import { Globe, Info } from "lucide-react";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onInspect: () => void;
  disabled?: boolean;
}

export function UrlInput({ value, onChange, onInspect, disabled }: UrlInputProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-editor px-3 py-2 transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
        <Globe className="h-4 w-4 shrink-0 text-faint" />
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled && value.trim()) onInspect();
          }}
          placeholder="https://example.com/login"
          aria-label="Page URL"
          className="mono w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
        />
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-muted">
          The page is fetched and analyzed server-side. JavaScript-rendered content will not appear — paste the
          rendered DOM for SPA pages.
        </p>
      </div>
    </div>
  );
}
