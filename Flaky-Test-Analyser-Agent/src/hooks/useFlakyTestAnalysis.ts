import { useCallback, useState } from 'react';
import type {
  AnalysisResult,
  AnalysisStage,
  AnalysisStatus,
  BuildDetails,
  BuildSlot,
  UploadedBuild,
} from '../types/flakyTest';
import { analyzeFlakyTests, normalizeLangflowResponse } from '../services/langflow/barrel';
import { LangflowError } from '../services/langflow/barrel';
import { validateJsonFile } from '../utils/fileValidation';

/**
 * useFlakyTestAnalysis — orchestrates the whole analysis workflow.
 *
 * Owns the build uploads, validation, analysis status, staged progress, and
 * the final result. All API communication stays inside the Langflow service;
 * this hook only coordinates the UI state machine.
 */

const STAGE_LABELS: Record<AnalysisStage, string> = {
  preparing: 'Preparing build results',
  sending: 'Sending data to AI analyzer',
  generating: 'Generating reliability report',
};

const STAGE_ORDER: AnalysisStage[] = ['preparing', 'sending', 'generating'];

export interface UseFlakyTestAnalysis {
  build1: UploadedBuild | undefined;
  build2: UploadedBuild | undefined;
  build1Details: BuildDetails | undefined;
  build2Details: BuildDetails | undefined;
  status: AnalysisStatus;
  stage: AnalysisStage | undefined;
  stageLabel: string;
  error: string | undefined;
  result: AnalysisResult | undefined;
  canAnalyze: boolean;
  uploadBuild: (slot: BuildSlot, file: File) => Promise<void>;
  removeBuild: (slot: BuildSlot) => void;
  runAnalysis: () => Promise<void>;
  reset: () => void;
}

export function useFlakyTestAnalysis(): UseFlakyTestAnalysis {
  const [build1, setBuild1] = useState<UploadedBuild | undefined>(undefined);
  const [build2, setBuild2] = useState<UploadedBuild | undefined>(undefined);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [stage, setStage] = useState<AnalysisStage | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<AnalysisResult | undefined>(undefined);

  const uploadBuild = useCallback(async (slot: BuildSlot, file: File) => {
    const validation = await validateJsonFile(file);
    const build: UploadedBuild = {
      file,
      content: await file.text(),
      valid: validation.valid,
      size: file.size,
    };
    if (slot === 'build1') {
      setBuild1(build);
    } else {
      setBuild2(build);
    }
  }, []);

  const removeBuild = useCallback((slot: BuildSlot) => {
    if (slot === 'build1') {
      setBuild1(undefined);
    } else {
      setBuild2(undefined);
    }
  }, []);

  const canAnalyze = Boolean(build1?.valid && build2?.valid);

  const runAnalysis = useCallback(async () => {
    if (!build1?.valid || !build2?.valid) {
      setError('Upload both Build 1 and Build 2 before starting analysis.');
      return;
    }

    setStatus('analyzing');
    setError(undefined);
    setResult(undefined);

    const progress = async (label: AnalysisStage) => {
      setStage(label);
      // Let the UI paint the stage label before the (potentially long) request.
      await new Promise((resolve) => requestAnimationFrame(resolve));
    };

    try {
      await progress('preparing');
      const payload = await analyzeFlakyTests(build1.content, build2.content);
      await progress('sending');
      const normalized = normalizeLangflowResponse(payload);
      await progress('generating');
      setResult(normalized);
      setStatus('success');
    } catch (caught: unknown) {
      const message =
        caught instanceof LangflowError
          ? caught.message
          : 'Analysis completed, but the response could not be rendered as structured results.';
      setError(message);
      setStatus('error');
    } finally {
      setStage(undefined);
    }
  }, [build1, build2]);

  const reset = useCallback(() => {
    setBuild1(undefined);
    setBuild2(undefined);
    setStatus('idle');
    setStage(undefined);
    setError(undefined);
    setResult(undefined);
  }, []);

  const stageLabel = stage ? STAGE_LABELS[stage] : '';
  const stageIndex = stage ? STAGE_ORDER.indexOf(stage) + 1 : undefined;

  return {
    build1,
    build2,
    build1Details: build1
      ? {
          fileName: build1.file.name,
          fileSize: build1.size,
          uploadTimestamp: new Date().toISOString(),
          validationStatus: build1.valid ? 'valid' : 'invalid',
        }
      : undefined,
    build2Details: build2
      ? {
          fileName: build2.file.name,
          fileSize: build2.size,
          uploadTimestamp: new Date().toISOString(),
          validationStatus: build2.valid ? 'valid' : 'invalid',
        }
      : undefined,
    status,
    stage: stageIndex ? stage : undefined,
    stageLabel,
    error,
    result,
    canAnalyze,
    uploadBuild,
    removeBuild,
    runAnalysis,
    reset,
  };
}
