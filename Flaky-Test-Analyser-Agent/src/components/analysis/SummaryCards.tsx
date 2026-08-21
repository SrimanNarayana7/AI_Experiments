import { AlertTriangle, Layers, RefreshCcw, XCircle } from 'lucide-react';
import type { AnalysisResult } from '../../types/flakyTest';

interface SummaryCardsProps {
  result: AnalysisResult;
}

function CountCard({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  tone: 'warning' | 'error' | 'neutral';
  hint: string;
}) {
  const toneClasses = {
    warning: 'text-amber-600',
    error: 'text-red-600',
    neutral: 'text-slate-700',
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-2 text-3xl font-semibold ${toneClasses[tone]}`}>
        {value === undefined ? '—' : value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export function SummaryCards({ result }: SummaryCardsProps) {
  const flakyCount =
    result.summary.flakyCount ?? (result.flakyTests.length > 0 ? result.flakyTests.length : undefined);
  const consistentCount =
    result.summary.consistentFailureCount ??
    (result.consistentFailures.length > 0 ? result.consistentFailures.length : undefined);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary counts">
      <CountCard
        icon={<RefreshCcw className="h-4 w-4" aria-hidden="true" />}
        label="Flaky Tests"
        value={flakyCount}
        tone="warning"
        hint="Tests requiring rerun"
      />
      <CountCard
        icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
        label="Consistent Failures"
        value={consistentCount}
        tone="error"
        hint="Tests failing in both builds"
      />
      <CountCard
        icon={<Layers className="h-4 w-4" aria-hidden="true" />}
        label="Build 1"
        value={result.summary.build1Total}
        tone="neutral"
        hint="Tests in build 1"
      />
      <CountCard
        icon={<Layers className="h-4 w-4" aria-hidden="true" />}
        label="Build 2"
        value={result.summary.build2Total}
        tone="neutral"
        hint="Tests in build 2"
      />
      {result.summary.text ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-4">
          <div className="flex items-center gap-2 text-slate-500">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-wide">Summary</p>
          </div>
          <p className="mt-2 text-sm text-slate-700">{result.summary.text}</p>
        </div>
      ) : null}
    </div>
  );
}
