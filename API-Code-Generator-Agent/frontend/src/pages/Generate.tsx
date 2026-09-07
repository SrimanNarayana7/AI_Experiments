import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, Link2, Sparkles, CheckCircle2 } from 'lucide-react';
import { parseSpec, generateTests } from '../services/api';
import type { ParseResponse, GenerateResponse, Framework } from '../types';

const FRAMEWORKS: { value: Framework; label: string }[] = [
  { value: 'playwright', label: 'Playwright API' },
  { value: 'restassured', label: 'REST Assured' },
  { value: 'karate', label: 'Karate' },
  { value: 'supertest', label: 'Supertest' },
];

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500';

export default function Generate() {
  const [framework, setFramework] = useState<Framework>('playwright');
  const [url, setUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ParseResponse | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseMutation = useMutation({
    mutationFn: () => parseSpec({ url: url || undefined, baseUrl: baseUrl || undefined, file: file ?? undefined }),
    onSuccess: (data) => {
      setAnalysis(data);
      setResult(null);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateTests({
        url: url || undefined,
        baseUrl: baseUrl || undefined,
        framework,
        additionalInstructions: instructions || undefined,
        file: file ?? undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Generate Tests</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Turn an OpenAPI contract into a runnable, measurable API test project.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Test Framework</label>
          <select value={framework} onChange={(e) => setFramework(e.target.value as Framework)} className={inputClass}>
            {FRAMEWORKS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">OpenAPI Specification</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5">
              <Upload size={16} />
              <span className="truncate">{file ? file.name : 'Upload .json / .yaml / .yml'}</span>
              <input
                type="file"
                accept=".json,.yaml,.yml"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="text-xs font-medium text-gray-400">or</span>
            <div className="flex flex-1 items-center gap-2">
              <Link2 size={16} className="shrink-0 text-gray-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/openapi.json"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">API Base URL</label>
          <input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com" className={inputClass} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Additional Instructions</label>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Optional guidance for test generation" className={inputClass} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => parseMutation.mutate()}
            disabled={parseMutation.isPending}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {parseMutation.isPending ? 'Analyzing…' : 'Analyze Specification'}
          </button>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
          >
            <Sparkles size={16} />
            {generateMutation.isPending ? 'Generating…' : 'Generate Tests'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {analysis && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-lg font-semibold">{analysis.title}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {analysis.format} {analysis.version} · {analysis.endpoints.length} endpoints
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {Object.entries(analysis.coverageRequirements).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{k}</div>
                  <div className="font-semibold">{String(v)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="font-medium">Expected scenarios:</span> {analysis.scenarioSummary.total}
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <div className="text-lg font-semibold">Generation Complete</div>
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {result.scenarioCount} scenarios · {result.files.length} files ·{' '}
              {result.coverage.coverage.overall}% contract coverage
            </div>
            <div className="mt-4 flex gap-3">
              <a
                href={result.downloadUrl}
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-indigo-700 hover:to-violet-700"
              >
                Download ZIP
              </a>
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">Generated files</div>
              {result.files.map((f) => (
                <div key={f.path} className="rounded-md bg-gray-50 px-3 py-1.5 font-mono text-xs dark:bg-gray-800">
                  {f.path}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
