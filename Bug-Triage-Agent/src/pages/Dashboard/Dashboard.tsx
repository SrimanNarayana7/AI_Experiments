import { useState } from 'react';
import type { BugTriageResult } from '../../types/triage';
import { analyzeBug } from '../../services/langflow';
import { TriageError } from '../../services/langflow/errors';
import { JiraInput } from '../../components/jira-input/JiraInput';
import { AnalysisLoading } from '../../components/loading/AnalysisLoading';
import { AnalysisError } from '../../components/error/AnalysisError';
import type { ErrorKind } from '../../components/error/AnalysisError';
import { TriageResults } from '../../components/triage/TriageResults';
import { EmptyState } from '../../components/empty-state/EmptyState';

interface AnalysisErrorState {
  title: string;
  message: string;
  kind: ErrorKind;
}

function toErrorState(error: unknown): AnalysisErrorState {
  if (error instanceof TriageError) {
    switch (error.code) {
      case 'INVALID_INPUT':
        return { title: 'Invalid issue key', message: error.message, kind: 'warning' };
      case 'TIMEOUT':
        return { title: 'Analysis timed out', message: error.message, kind: 'warning' };
      case 'NETWORK_ERROR':
        return { title: 'Service unreachable', message: error.message, kind: 'critical' };
      case 'UNAUTHORIZED':
        return { title: 'Unauthorized', message: error.message, kind: 'critical' };
      case 'FORBIDDEN':
        return { title: 'Access denied', message: error.message, kind: 'critical' };
      case 'NOT_FOUND':
        return { title: 'Not found', message: error.message, kind: 'warning' };
      case 'ISSUE_NOT_FOUND':
        return {
          title: 'Issue not found',
          message:
            'The Jira issue you entered could not be found. Please check the issue key and try again.',
          kind: 'warning',
        };
      case 'INVALID_RESPONSE':
        return { title: 'Unexpected response', message: error.message, kind: 'critical' };
      case 'LANGFLOW_ERROR':
      case 'MISSING_CONFIG':
        return { title: 'Analysis failed', message: error.message, kind: 'critical' };
    }
  }
  return {
    title: 'Unexpected error',
    message: 'Something went wrong while analyzing the issue. Please try again.',
    kind: 'critical',
  };
}

export function Dashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<BugTriageResult | null>(null);
  const [error, setError] = useState<AnalysisErrorState | null>(null);
  const [lastIssueKey, setLastIssueKey] = useState<string | null>(null);

  async function handleAnalyze(issueKey: string) {
    setLastIssueKey(issueKey);
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await analyzeBug(issueKey);
      setResult(data);
    } catch (caught) {
      setError(toErrorState(caught));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleRetry() {
    if (lastIssueKey) {
      void handleAnalyze(lastIssueKey);
    }
  }

  return (
    <div className="dashboard">
      <JiraInput onSubmit={handleAnalyze} disabled={isAnalyzing} />

      <div className="dashboard__stage" aria-live="polite">
        {isAnalyzing && <AnalysisLoading />}
        {!isAnalyzing && error && (
          <AnalysisError title={error.title} message={error.message} kind={error.kind} onRetry={handleRetry} />
        )}
        {!isAnalyzing && !error && !result && <EmptyState />}
        {!isAnalyzing && !error && result && <TriageResults result={result} />}
      </div>
    </div>
  );
}
