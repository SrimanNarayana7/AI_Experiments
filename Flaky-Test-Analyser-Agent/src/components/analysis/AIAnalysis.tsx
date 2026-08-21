import { useState } from 'react';
import { Bot, ChevronDown, Copy } from 'lucide-react';
import { Button } from '../common/Button';

interface AIAnalysisProps {
  rawResponse: string;
}

export function AIAnalysis({ rawResponse }: AIAnalysisProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rawResponse);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore.
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="ai-analysis-heading">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={open}
          aria-controls="ai-analysis-content"
        >
          <Bot className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <div>
            <h2 id="ai-analysis-heading" className="text-sm font-semibold text-slate-800">
              AI Analysis
            </h2>
            <p className="text-xs text-slate-500">Raw Langflow agent response</p>
          </div>
          <ChevronDown
            className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <Button variant="secondary" onClick={copy} className="shrink-0">
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          {copied ? 'Copied' : 'Copy Analysis'}
        </Button>
      </div>

      {open ? (
        <pre
          id="ai-analysis-content"
          className="max-h-96 overflow-auto border-t border-slate-100 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700"
        >
          {rawResponse}
        </pre>
      ) : null}
    </section>
  );
}
