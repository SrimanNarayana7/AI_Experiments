import type { Confidence, Priority } from '../../types/triage';
import { ScaleIcon, ZapIcon } from '../icons';

interface PriorityCardProps {
  priority: Priority;
  confidence: Confidence;
  reason: string;
}

const PRIORITY_META: Record<Priority, { label: string; tone: string; description: string }> = {
  P1: {
    label: 'Urgent',
    tone: 'priority-p1',
    description:
      'Critical business impact affecting many users or blocking release. Requires immediate attention.',
  },
  P2: {
    label: 'High',
    tone: 'priority-p2',
    description: 'Significant business impact with no effective workaround. Should be fixed promptly.',
  },
  P3: {
    label: 'Normal',
    tone: 'priority-p3',
    description: 'Limited business impact, usually with a workaround available. Scheduled normally.',
  },
};

export function PriorityCard({ priority, confidence, reason }: PriorityCardProps) {
  const meta = PRIORITY_META[priority];
  return (
    <section className="card assessment-card" aria-labelledby="priority-heading">
      <div className="assessment-card__heading">
        <span className="assessment-card__icon" aria-hidden="true">
          <ScaleIcon size={16} />
        </span>
        <h3 className="assessment-card__title" id="priority-heading">
          Priority
        </h3>
        <span className={`confidence-chip confidence-chip--${confidence.toLowerCase()}`}>
          {confidence} confidence
        </span>
      </div>
      <div className={`assessment-card__value ${meta.tone}`}>
        {priority}
        <span className="assessment-card__value-label">{meta.label}</span>
      </div>
      <div className="assessment-card__description">
        <span className="assessment-card__desc-icon" aria-hidden="true">
          <ZapIcon size={14} />
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
