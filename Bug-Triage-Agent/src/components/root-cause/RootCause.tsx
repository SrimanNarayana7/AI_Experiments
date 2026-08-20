import type { RootCauseAnalysis } from '../../types/triage';
import {
  CheckIcon,
  FileTextIcon,
  MicroscopeIcon,
  TargetIcon,
  AlertTriangleIcon,
} from '../icons';

interface RootCauseProps {
  analysis: RootCauseAnalysis;
}

function ListBlock({
  title,
  items,
  tone,
  icon: Icon,
}: {
  title: string;
  items: string[];
  tone: 'facts' | 'unknowns' | 'evidence';
  icon: typeof CheckIcon;
}) {
  return (
    <div className={`rc-block rc-block--${tone}`}>
      <h4 className="rc-block__title">
        <span className="rc-block__title-icon" aria-hidden="true">
          <Icon size={15} />
        </span>
        {title}
      </h4>
      <ul className="rc-block__list">
        {items.map((item) => (
          <li className="rc-block__item" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RootCause({ analysis }: RootCauseProps) {
  return (
    <section className="card root-cause-card" aria-labelledby="root-cause-heading">
      <div className="section-heading">
        <span className="section-heading__icon" aria-hidden="true">
          <MicroscopeIcon size={16} />
        </span>
        <h3 className="section-heading__title" id="root-cause-heading">
          Root Cause Analysis
        </h3>
      </div>
      <div className="root-cause-grid">
        <div className="root-cause__facts-col">
          <ListBlock
            title="Confirmed Facts"
            items={analysis.confirmed_facts}
            tone="facts"
            icon={CheckIcon}
          />
          <ListBlock
            title="Unknown Information"
            items={analysis.unknowns}
            tone="unknowns"
            icon={AlertTriangleIcon}
          />
        </div>
        <div className="root-cause__hypothesis-col">
          <div className="rc-block rc-block--hypothesis">
            <h4 className="rc-block__title">
              <span className="rc-block__title-icon" aria-hidden="true">
                <TargetIcon size={15} />
              </span>
              Root Cause Hypothesis
            </h4>
            <p className="rc-block__hypothesis-text">{analysis.hypothesis}</p>
          </div>
          <ListBlock
            title="Evidence Required"
            items={analysis.evidence_required}
            tone="evidence"
            icon={FileTextIcon}
          />
        </div>
      </div>
    </section>
  );
}
