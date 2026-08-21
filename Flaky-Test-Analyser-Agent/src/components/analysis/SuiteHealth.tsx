import { Activity } from 'lucide-react';
import type { AnalysisResult } from '../../types/flakyTest';
import { StatusBadge } from '../common/StatusBadge';

interface SuiteHealthProps {
  result: AnalysisResult;
}

function deriveHealth(result: AnalysisResult): { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' } {
  if (result.summary.health) {
    const health = result.summary.health.toLowerCase();
    if (health.includes('healthy')) {
      return { label: 'Healthy', tone: 'success' };
    }
    if (health.includes('critical')) {
      return { label: 'Critical', tone: 'error' };
    }
    if (health.includes('unstable') || health.includes('attention')) {
      return { label: 'Unstable', tone: 'warning' };
    }
  }

  const failures = result.consistentFailures.length;
  const flaky = result.flakyTests.length;

  if (failures === 0 && flaky === 0) {
    return { label: 'Healthy', tone: 'success' };
  }
  if (failures > 0) {
    return { label: 'Attention Required', tone: 'error' };
  }
  if (flaky > 0) {
    return { label: 'Unstable', tone: 'warning' };
  }
  return { label: 'Not Assessed', tone: 'neutral' };
}

export function SuiteHealth({ result }: SuiteHealthProps) {
  const health = deriveHealth(result);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Activity className="h-4 w-4" aria-hidden="true" />
        <h2 className="text-xs font-medium uppercase tracking-wide">Suite Health</h2>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <StatusBadge tone={health.tone}>
          <span
            className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
              health.tone === 'success'
                ? 'bg-emerald-500'
                : health.tone === 'warning'
                  ? 'bg-amber-500'
                  : health.tone === 'error'
                    ? 'bg-red-500'
                    : 'bg-slate-400'
            }`}
            aria-hidden="true"
          />
          {health.label}
        </StatusBadge>
        {result.summary.text ? (
          <p className="text-xs text-slate-500">{result.summary.text}</p>
        ) : (
          <p className="text-xs text-slate-400">
            Derived from the AI summary and available counts.
          </p>
        )}
      </div>
    </section>
  );
}
