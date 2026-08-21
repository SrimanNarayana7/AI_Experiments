import { Header } from '../components/layout/Header';
import { BuildComparison } from '../components/upload/BuildComparison';
import { AnalysisDashboard } from '../components/analysis/AnalysisDashboard';
import { useFlakyTestAnalysis } from '../hooks/useFlakyTestAnalysis';

/**
 * FlakyTestAnalyzerPage — the single page of the app.
 *
 * Owns the workflow: upload two Playwright result.json files, validate them,
 * send both to the existing Langflow FlakyTest_AI_Agent, and render the
 * reliability dashboard. All intelligence stays in Langflow.
 */

export function FlakyTestAnalyzerPage() {
  const analysis = useFlakyTestAnalysis();

  const connected = Boolean(
    import.meta.env.VITE_LANGFLOW_API_URL || import.meta.env.VITE_LANGFLOW_PROXY_URL,
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header connected={connected} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Flaky Test Analyzer
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Compare two Playwright builds and identify flaky tests, consistent failures, and
            recommended actions.
          </p>
        </div>

        {analysis.status === 'success' && analysis.result ? (
          <AnalysisDashboard
            result={analysis.result}
            build1={analysis.build1}
            build2={analysis.build2}
            build1Details={analysis.build1Details}
            build2Details={analysis.build2Details}
            onNewAnalysis={analysis.reset}
          />
        ) : (
          <BuildComparison
            build1={analysis.build1}
            build2={analysis.build2}
            status={analysis.status}
            stage={analysis.stage}
            stageLabel={analysis.stageLabel}
            error={analysis.error}
            canAnalyze={analysis.canAnalyze}
            onUpload={analysis.uploadBuild}
            onRemove={analysis.removeBuild}
            onAnalyze={analysis.runAnalysis}
          />
        )}
      </main>
    </div>
  );
}
