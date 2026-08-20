import type { Confidence, Severity } from '../../types/triage';
import { ActivityIcon, AlertTriangleIcon } from '../icons';

interface SeverityCardProps {
  severity: Severity;
  confidence: Confidence;
  reason: string;
}

const SEVERITY_META: Record<Severity, { label: string; tone: string; description: string }> = {
  S1: {
    label: 'Critical',
    tone: 'severity-s1',
    description:
      'Blocks critical business workflows, causes data loss or corruption, or introduces a security vulnerability.',
  },
  S2: {
    label: 'High',
    tone: 'severity-s2',
    description: 'Significant functional impact on a major feature or user journey with no practical workaround.',
  },
  S3: {
    label: 'Moderate',
    tone: 'severity-s3',
    description: 'Limited functional impact on a secondary area, usually with a workaround available.',
  },
};

export function SeverityCard({ severity, confidence, reason }: SeverityCardProps) {
  const meta = SEVERITY_META[severity];
  return (
    <section className="card assessment-card" aria-labelledby="severity-heading">
      <div className="assessment-card__heading">
        <span className="assessment-card__icon" aria-hidden="true">
          <ActivityIcon size={16} />
        </span>
        <h3 className="assessment-card__title" id="severity-heading">
          Severity
        </h3>
        <span className={`confidence-chip confidence-chip--${confidence.toLowerCase()}`}>
          {confidence} confidence
        </span>
      </div>
      <div className={`assessment-card__value ${meta.tone}`}>
        {severity}
        <span className="assessment-card__value-label">{meta.label}</span>
      </div>
      <div className="assessment-card__description">
        <span className="assessment-card__desc-icon" aria-hidden="true">
          <AlertTriangleIcon size={14} />
        </span>
        <p>{meta.description}</p>
      </div>
      <div className="assessment-card__reason">
        <h4 className="assessment-card__reason-label">Reason</h4>
        <p className="assessment-card__reason-text">{reason}</p>
      </div>
    </section>
  );
}
