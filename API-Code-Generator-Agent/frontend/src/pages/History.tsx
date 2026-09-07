import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '../services/api';
import { History as HistoryIcon } from 'lucide-react';

export default function History() {
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: fetchStats });

  return (
    <div>
      <h1 className="text-2xl font-bold">History</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Generation run history.</p>

      <div className="mt-6">
        {isLoading && <div className="text-sm text-gray-500">Loading…</div>}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Failed to load history.
          </div>
        )}
        {data && data.history.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            <HistoryIcon size={28} className="text-gray-400" />
            No runs yet. Generations will appear here.
          </div>
        )}
        <div className="space-y-2">
          {data?.history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <div className="font-medium">{item.projectName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.endpointCount} endpoints · {item.scenarioCount} scenarios
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{item.coverage}%</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
