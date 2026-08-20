import { ActivityIcon, FileSearchIcon, LayersIcon } from '../icons';

const STEPS = [
  { icon: FileSearchIcon, label: 'Fetching Jira issue' },
  { icon: LayersIcon, label: 'Analyzing defect' },
  { icon: ActivityIcon, label: 'Generating triage' },
] as const;

/**
 * Enterprise-style indeterminate loading indicator. The steps are visual
 * progress only — the frontend cannot observe each stage independently.
 */
export function AnalysisLoading() {
  return (
    <section className="loading-card" aria-live="polite" aria-busy="true" aria-label="Analysis in progress">
      <div className="loading-card__heading">
        <span className="loading-spinner" aria-hidden="true" />
        <h2 className="loading-card__title">Analyzing Bug…</h2>
      </div>
      <ul className="loading-steps">
        {STEPS.map(({ icon: Icon, label }) => (
          <li className="loading-steps__item" key={label}>
            <span className="loading-steps__icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
