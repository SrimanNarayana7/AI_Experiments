import type { ConsistentFailure } from '../../types/flakyTest';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { Bug } from 'lucide-react';

interface ConsistentFailuresTableProps {
  failures: ConsistentFailure[];
}

export function ConsistentFailuresTable({ failures }: ConsistentFailuresTableProps) {
  const hasBuildStatus = failures.some((failure) => failure.build1Status || failure.build2Status);
  const columns = hasBuildStatus
    ? ['Test Name', 'Build 1', 'Build 2', 'Probable Root Cause', 'Recommended Action']
    : ['Test Name', 'Probable Root Cause', 'Recommended Action'];

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
      aria-labelledby="consistent-failures-heading"
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 id="consistent-failures-heading" className="text-sm font-semibold text-slate-800">
              Consistent Failures
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tests failing consistently across both builds. These are not considered flaky.
            </p>
          </div>
          <StatusBadge tone="error">CONSISTENT FAILURE</StatusBadge>
        </div>
      </div>

      {failures.length === 0 ? (
        <EmptyState
          title="No consistent failures detected"
          description="The AI analysis did not identify any tests failing in both builds."
          icon={<Bug className="h-6 w-6" aria-hidden="true" />}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                {columns.map((column) => (
                  <th key={column} scope="col" className="px-4 py-2.5 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {failures.map((failure, index) => (
                <tr key={`${failure.name}-${index}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{failure.name}</span>
                      <StatusBadge tone="error">CONSISTENT FAILURE</StatusBadge>
                    </div>
                  </td>
                  {hasBuildStatus ? (
                    <>
                      <td className="px-4 py-3">
                        <BuildStatus value={failure.build1Status} />
                      </td>
                      <td className="px-4 py-3">
                        <BuildStatus value={failure.build2Status} />
                      </td>
                    </>
                  ) : null}
                  <td className="px-4 py-3 text-slate-600">
                    {failure.rootCause ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {failure.action ?? 'Send to Engineering'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BuildStatus({ value }: { value: string | undefined }) {
  if (!value) {
    return <span className="text-slate-300">—</span>;
  }
  const upper = value.toUpperCase();
  const tone = upper.startsWith('PASS')
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-red-50 text-red-700';
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>
      {value}
    </span>
  );
}
