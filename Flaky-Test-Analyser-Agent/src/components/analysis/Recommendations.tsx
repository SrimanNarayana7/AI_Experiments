import { RefreshCcw, Wrench } from 'lucide-react';
import type { RerunRecommendation } from '../../types/flakyTest';
import { EmptyState } from '../common/EmptyState';

interface RecommendationsProps {
  recommendation: RerunRecommendation;
  flakyNames: string[];
  failureNames: string[];
}

export function Recommendations({ recommendation, flakyNames, failureNames }: RecommendationsProps) {
  const rerunItems =
    recommendation.rerun.length > 0 ? recommendation.rerun : flakyNames.length > 0 ? ['Tests flagged as FLAKY'] : [];
  const engineeringItems =
    recommendation.engineering.length > 0
      ? recommendation.engineering
      : failureNames.length > 0
        ? ['Tests flagged as CONSISTENT FAILURE']
        : [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="recommendations-heading">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 id="recommendations-heading" className="text-sm font-semibold text-slate-800">
          Recommended Actions
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          How to handle each category of test result.
        </p>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div className="rounded-md border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-amber-800">RERUN</h3>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            Tests that should be rerun because they appear flaky. Do not immediately fix the test.
          </p>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
              <RefreshCcw className="h-3 w-3" aria-hidden="true" />
              Rerun / Quarantine
            </span>
          </div>
          {rerunItems.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {rerunItems.slice(0, 6).map((item, index) => (
                <li key={`${item}-${index}`} className="text-xs text-slate-600">
                  • {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-md border border-red-200 bg-red-50/50 p-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-red-600" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-red-800">ENGINEERING INVESTIGATION</h3>
          </div>
          <p className="mt-1 text-xs text-red-700">
            Tests failing consistently. Investigate the application defect.
          </p>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
              <Wrench className="h-3 w-3" aria-hidden="true" />
              Send to Engineering
            </span>
          </div>
          {engineeringItems.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {engineeringItems.slice(0, 6).map((item, index) => (
                <li key={`${item}-${index}`} className="text-xs text-slate-600">
                  • {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {rerunItems.length === 0 && engineeringItems.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptyState
            title="No recommendations available"
            description="The AI analysis did not produce rerun or engineering recommendations."
          />
        </div>
      ) : null}
    </section>
  );
}
