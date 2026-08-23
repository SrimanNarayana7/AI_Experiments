import { Badge } from '../ui/Badge';

function scoreLabel(score: number) {
  if (score >= 95) return 'Outstanding';
  if (score >= 85) return 'Excellent Match';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Needs Improvement';
  return 'Poor';
}

export function ScoreCard({
  score,
  subtitle = 'Internal Resume Match Score',
}: {
  score: number | null | undefined;
  subtitle?: string;
}) {
  const value = score ?? 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{subtitle}</p>
          <h3 className="mt-1 text-3xl font-semibold tracking-tight text-card-foreground">
            {value}
            <span className="text-base font-medium text-muted-foreground">/100</span>
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{scoreLabel(value)}</p>
        </div>
        <div className="relative h-24 w-24">
          <svg className="-rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={radius} className="fill-none stroke-muted" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="fill-none stroke-primary transition-all duration-700"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Badge variant={value >= 85 ? 'success' : value >= 60 ? 'warning' : 'destructive'}>
              {scoreLabel(value)}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
