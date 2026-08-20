import { FileTextIcon } from '../icons';

interface TriageJustificationProps {
  justification: string;
}

export function TriageJustification({ justification }: TriageJustificationProps) {
  return (
    <section className="card justification-card" aria-labelledby="justification-heading">
      <div className="section-heading">
        <span className="section-heading__icon" aria-hidden="true">
          <FileTextIcon size={16} />
        </span>
        <h3 className="section-heading__title" id="justification-heading">
          Triage Justification
        </h3>
      </div>
      <p className="justification-card__text">{justification}</p>
    </section>
  );
}
