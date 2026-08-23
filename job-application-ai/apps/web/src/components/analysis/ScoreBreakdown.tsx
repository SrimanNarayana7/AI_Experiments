import type { ScoreBreakdown } from '@repo/shared';

const entries: Array<[keyof ScoreBreakdown, string]> = [
  ['requiredSkills', 'Required Skills'],
  ['preferredSkills', 'Preferred Skills'],
  ['roleAlignment', 'Role Alignment'],
  ['experienceAlignment', 'Experience Alignment'],
  ['domainAlignment', 'Domain Alignment'],
  ['keywordCoverage', 'Keyword Coverage'],
  ['atsReadability', 'ATS Readability'],
];

export function ScoreBreakdownCard({ breakdown }: { breakdown: ScoreBreakdown | null | undefined }) {
  if (!breakdown) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {entries.map(([key, label]) => {
          const value = breakdown[key];
          return (
            <div key={label} className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 text-xl font-semibold text-card-foreground">{value}/100</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3">
        <p className="text-sm text-muted-foreground">
          This is an internal resume-to-JD match score and not a guaranteed ATS score from a third-party vendor.
        </p>
      </div>
    </div>
  );
}
