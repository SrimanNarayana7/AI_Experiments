import { AlertCircleIcon, AlertTriangleIcon, RotateCcwIcon } from '../icons';

export type ErrorKind = 'warning' | 'critical';

interface AnalysisErrorProps {
  title: string;
  message: string;
  kind?: ErrorKind;
  onRetry?: () => void;
}

export function AnalysisError({
  title,
  message,
  kind = 'critical',
  onRetry,
}: AnalysisErrorProps) {
  const Icon = kind === 'warning' ? AlertTriangleIcon : AlertCircleIcon;
  return (
    <section className={`error-card error-card--${kind}`} role="alert" aria-live="assertive">
      <div className="error-card__icon" aria-hidden="true">
        <Icon size={20} />
      </div>
      <div className="error-card__content">
        <h2 className="error-card__title">{title}</h2>
        <p className="error-card__message">{message}</p>
      </div>
      {onRetry && (
        <button className="btn btn--secondary error-card__retry" type="button" onClick={onRetry}>
          <RotateCcwIcon size={15} />
          <span>Retry</span>
        </button>
      )}
    </section>
  );
}
