import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '../services/api';
import {
  FileText,
  GitBranch,
  TestTube2,
  Gauge,
  Package,
  ArrowUpRight,
} from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof FileText;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['stats'], queryFn: fetchStats });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Specifications processed, endpoints analyzed, and tests generated.
          </p>
        </div>
      </div>

      {isLoading && <div className="mt-8 text-sm text-gray-500">Loading metrics…</div>}
      {isError && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Could not load metrics. Start the backend and refresh.
        </div>
      )}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Specifications Processed" value={data.specificationsProcessed} icon={FileText} />
            <StatCard label="Endpoints Analyzed" value={data.endpointsAnalyzed} icon={GitBranch} />
            <StatCard label="Tests Generated" value={data.testsGenerated} icon={TestTube2} />
            <StatCard label="Average Coverage" value={`${data.averageCoverage}%`} icon={Gauge} />
            <StatCard label="Projects Generated" value={data.projectsGenerated} icon={Package} />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold">Recent Generations</h2>
            {data.history.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                No generations yet. Head to Generate Tests to create your first project.
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium">Framework</th>
                      <th className="px-4 py-3 font-medium">Endpoints</th>
                      <th className="px-4 py-3 font-medium">Scenarios</th>
                      <th className="px-4 py-3 font-medium">Coverage</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.history.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium">{item.projectName}</td>
                        <td className="px-4 py-3 capitalize">{item.framework}</td>
                        <td className="px-4 py-3">{item.endpointCount}</td>
                        <td className="px-4 py-3">{item.scenarioCount}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            {item.coverage}% <ArrowUpRight size={12} />
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
