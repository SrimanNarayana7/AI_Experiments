import type { BugTriageResult } from '../../types/triage';
import { ChevronRightIcon, FileTextIcon } from '../icons';

interface TriageHeaderProps {
  result: BugTriageResult;
}

export function TriageHeader({ result }: TriageHeaderProps) {
  const hasStatusMeta = Boolean(result.issue_type || result.status);
  return (
    <section className="triage-header card">
      <div className="triage-header__icon" aria-hidden="true">
        <FileTextIcon size={22} />
      </div>
      <div className="triage-header__meta">
        <h2 className="triage-header__title">{result.summary}</h2>
        <div className="triage-header__row">
          <span className="issue-key">{result.issue_key}</span>
          {result.issue_type && (
            <>
              <ChevronRightIcon size={14} />
              <span>{result.issue_type}</span>
            </>
          )}
          {hasStatusMeta && <span className="triage-header__divider" aria-hidden="true" />}
          {result.status && (
            <span className="status-chip">
              <span className="status-chip__dot" aria-hidden="true" />
              {result.status}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
