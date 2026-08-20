import type { BugTriageResult } from '../../types/triage';
import { TriageHeader } from './TriageHeader';
import { SeverityCard } from '../severity/SeverityCard';
import { PriorityCard } from '../priority/PriorityCard';
import { ImpactAreas } from '../impact-areas/ImpactAreas';
import { RootCause } from '../root-cause/RootCause';
import { TriageJustification } from './TriageJustification';

interface TriageResultsProps {
  result: BugTriageResult;
}

export function TriageResults({ result }: TriageResultsProps) {
  return (
    <div className="triage-results">
      <TriageHeader result={result} />
      <div className="assessment-grid">
        <SeverityCard
          severity={result.severity.value}
          confidence={result.severity.confidence}
          reason={result.severity.reason}
        />
        <PriorityCard
          priority={result.priority.value}
          confidence={result.priority.confidence}
          reason={result.priority.reason}
        />
      </div>
      <ImpactAreas areas={result.impact_areas} />
      <RootCause analysis={result.root_cause_analysis} />
      <TriageJustification justification={result.triage_justification} />
    </div>
  );
}
