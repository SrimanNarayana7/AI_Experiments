import { FlaskConical, Loader2, Sparkles } from 'lucide-react';
import type { AnalysisStage, BuildSlot, UploadedBuild } from '../../types/flakyTest';
import { BuildUploadCard } from './BuildUploadCard';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';

interface BuildComparisonProps {
  build1: UploadedBuild | undefined;
  build2: UploadedBuild | undefined;
  status: 'idle' | 'validating' | 'uploading' | 'analyzing' | 'success' | 'error';
  stage: AnalysisStage | undefined;
  stageLabel: string;
  error: string | undefined;
  canAnalyze: boolean;
  onUpload: (slot: BuildSlot, file: File) => void;
  onRemove: (slot: BuildSlot) => void;
  onAnalyze: () => void;
  onReset?: () => void;
}

const STAGE_ORDER: AnalysisStage[] = ['preparing', 'sending', 'generating'];

export function BuildComparison({
  build1,
  build2,
  status,
  stage,
  stageLabel,
  error,
  canAnalyze,
  onUpload,
  onRemove,
  onAnalyze,
  onReset,
}: BuildComparisonProps) {
  const isAnalyzing = status === 'analyzing';
  const currentStage = stage ? STAGE_ORDER.indexOf(stage) + 1 : undefined;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="build-comparison-heading">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 id="build-comparison-heading" className="text-sm font-semibold text-slate-800">
          Build Comparison
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Upload the Playwright result.json from two builds to compare.
        </p>
      </div>

      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <BuildUploadCard
            slot="build1"
            label="Build 1"
            description="Upload the Playwright result.json from the baseline build."
            build={build1}
            disabled={isAnalyzing}
            onUpload={onUpload}
            onRemove={onRemove}
          />
          <BuildUploadCard
            slot="build2"
            label="Build 2"
            description="Upload the Playwright result.json from the comparison build."
            build={build2}
            disabled={isAnalyzing}
            onUpload={onUpload}
            onRemove={onRemove}
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={canAnalyze ? 'success' : 'neutral'}>
              {build1 && build2 ? 'Builds ready' : 'Awaiting builds'}
            </StatusBadge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onReset ? (
              <Button variant="secondary" onClick={onReset} disabled={isAnalyzing}>
                Reset
              </Button>
            ) : null}
            <Button onClick={onAnalyze} disabled={!canAnalyze || isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4" aria-hidden="true" />
                  Analyze Flakiness
                </>
              )}
            </Button>
          </div>
        </div>

        {isAnalyzing ? (
          <div className="mt-4 rounded-md border border-sky-100 bg-sky-50 px-4 py-3" role="status">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-600" aria-hidden="true" />
              <p className="text-sm font-medium text-sky-800">Analyzing test reliability...</p>
            </div>
            <ol className="mt-3 space-y-2">
              {STAGE_ORDER.map((item, index) => {
                const step = index + 1;
                const isCurrent = step === currentStage;
                const isDone = currentStage !== undefined && step < currentStage;
                return (
                  <li key={item} className="flex items-center gap-2 text-xs">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-700'
                          : isCurrent
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                      aria-hidden="true"
                    >
                      {isDone ? '✓' : step}
                    </span>
                    <span className={isCurrent ? 'font-medium text-sky-800' : 'text-slate-500'}>
                      Step {step} of {STAGE_ORDER.length}:{' '}
                      {item === 'preparing'
                        ? 'Preparing build results'
                        : item === 'sending'
                          ? 'Sending data to AI analyzer'
                          : 'Generating reliability report'}
                    </span>
                  </li>
                );
              })}
            </ol>
            {stageLabel ? (
              <p className="mt-2 text-xs text-sky-600">{stageLabel}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
