import { ClipboardPaste, Eraser, Sparkles } from "lucide-react";
import { useRef } from "react";
import { Button } from "../common/Button";

interface DomEditorProps {
  value: string;
  onChange: (value: string) => void;
  onLoadSample: () => void;
}

export function DomEditor({ value, onChange, onLoadSample }: DomEditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split("\n");

  function syncScroll(event: React.UIEvent<HTMLTextAreaElement>) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = event.currentTarget.scrollTop;
    }
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text);
    } catch {
      // Clipboard permission unavailable; ignore silently.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-line bg-editor transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <span className="mono text-[11px] font-medium uppercase tracking-wider text-faint">index.html</span>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={paste}>
              <ClipboardPaste className="h-3.5 w-3.5" /> Paste
            </Button>
            <Button variant="ghost" size="sm" onClick={onLoadSample}>
              <Sparkles className="h-3.5 w-3.5" /> Sample
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange("")} disabled={!value}>
              <Eraser className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>
        <div className="flex h-[320px]">
          <div
            ref={gutterRef}
            aria-hidden="true"
            className="mono w-11 shrink-0 select-none overflow-hidden border-r border-editor-line py-3 pr-2 text-right text-[12px] leading-6 text-faint"
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            placeholder={'Paste HTML or DOM markup…\n\n<form>\n  <button id="login" data-testid="login-button">Login</button>\n</form>'}
            aria-label="HTML or DOM input"
            className="mono h-full min-h-0 flex-1 resize-none bg-transparent px-3 py-3 text-[13px] leading-6 text-ink outline-none placeholder:text-faint"
          />
        </div>
      </div>
      <p className="text-right text-[11px] tabular-nums text-faint">
        {value.length.toLocaleString()} characters · {lines.length} lines
      </p>
    </div>
  );
}
