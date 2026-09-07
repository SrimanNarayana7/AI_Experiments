import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '../services/api';
import { Package, Download } from 'lucide-react';

export default function Projects() {
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: fetchStats });

  return (
    <div>
      <h1 className="text-2xl font-bold">Projects</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Generated test projects.</p>

      <div className="mt-6">
        {isLoading && <div className="text-sm text-gray-500">Loading…</div>}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Failed to load projects.
          </div>
        )}
        {data && data.history.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            No projects generated yet.
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {data?.history.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Package size={18} />
                </span>
                <div>
                  <div className="font-medium">{p.projectName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {p.framework} · {p.scenarioCount} scenarios
                  </div>
                </div>
              </div>
              <a
                href={`/api/projects/${p.id}/download`}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Download size={14} />
                ZIP
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
