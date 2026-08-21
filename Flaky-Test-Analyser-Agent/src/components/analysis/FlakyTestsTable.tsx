import type { FlakyTest } from '../../types/flakyTest';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { RefreshCcw } from 'lucide-react';

interface FlakyTestsTableProps {
  tests: FlakyTest[];
}

export function FlakyTestsTable({ tests }: FlakyTestsTableProps) {
  const hasBuildStatus = tests.some((test) => test.build1Status || test.build2Status);
  const columns = hasBuildStatus
    ? ['Test Name', 'Build 1', 'Build 2', 'Likely Cause', 'Recommended Action']
    : ['Test Name', 'Hypothesis', 'Action'];

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="flaky-tests-heading">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 id="flaky-tests-heading" className="text-sm font-semibold text-slate-800">
              Flaky Tests
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tests showing non-deterministic behavior across builds.
            </p>
          </div>
          <StatusBadge tone="warning">FLAKY</StatusBadge>
        </div>
      </div>

      {tests.length === 0 ? (
        <EmptyState
          title="No flaky tests detected"
          description="The AI analysis did not identify any tests with non-deterministic results."
          icon={<RefreshCcw className="h-6 w-6" aria-hidden="true" />}
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
              {tests.map((test, index) => (
                <tr key={`${test.name}-${index}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{test.name}</span>
                      <StatusBadge tone="warning">FLAKY</StatusBadge>
                    </div>
                  </td>
                  {hasBuildStatus ? (
                    <>
                      <td className="px-4 py-3">
                        <BuildStatus value={test.build1Status} />
                      </td>
                      <td className="px-4 py-3">
                        <BuildStatus value={test.build2Status} />
                      </td>
                    </>
                  ) : null}
                  <td className="px-4 py-3 text-slate-600">
                    {test.hypothesis ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {test.action ?? 'Rerun'}
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
  const tone =
    upper.startsWith('PASS') || upper === 'FLAKY'
      ? 'bg-emerald-50 text-emerald-700'
      : upper.startsWith('FAIL') || upper === 'ERROR'
        ? 'bg-red-50 text-red-700'
        : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>
      {value}
    </span>
  );
}
