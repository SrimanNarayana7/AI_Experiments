export type Severity = 'S1' | 'S2' | 'S3';

export type Priority = 'P1' | 'P2' | 'P3';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SeverityAssessment {
  value: Severity;
  confidence: Confidence;
  reason: string;
}

export interface PriorityAssessment {
  value: Priority;
  confidence: Confidence;
  reason: string;
}

export interface RootCauseAnalysis {
  confirmed_facts: string[];
  hypothesis: string;
  unknowns: string[];
  evidence_required: string[];
}

export interface BugTriageResult {
  issue_key: string;
  summary: string;
  issue_type?: string;
  status?: string;
  severity: SeverityAssessment;
  priority: PriorityAssessment;
  impact_areas: string[];
  root_cause_analysis: RootCauseAnalysis;
  triage_justification: string;
}
