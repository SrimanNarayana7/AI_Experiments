import { useMemo, useState } from 'react';
import type { ResumeLibraryItem, ResumeVersion } from '@repo/shared';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs } from '../ui/Tabs';
import { Select } from '../ui/Select';
import { ScoreCard } from '../analysis/ScoreCard';
import { ScoreBreakdownCard } from '../analysis/ScoreBreakdown';
import { api } from '../../services/api';

export function ResumePreviewModal({
  open,
  onClose,
  title,
  pdfUrl,
  fileName,
  score,
  breakdown,
  details,
  onMakeCurrent,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  pdfUrl: string;
  fileName: string;
  score?: number | null;
  breakdown?: Record<string, number> | null;
  details: Array<{ label: string; value: string }>;
  onMakeCurrent?: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      description={fileName}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}>
            Download PDF
          </Button>
          {onMakeCurrent && (
            <Button variant="secondary" onClick={onMakeCurrent}>
              Make Current
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
          <iframe title={title} src={pdfUrl} className="h-[70vh] w-full" />
        </div>
        <div className="space-y-4">
          <ScoreCard score={score ?? 0} />
          {breakdown && <ScoreBreakdownCard breakdown={breakdown as never} />}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-card-foreground">Resume Details</p>
            <div className="space-y-2 text-sm">
              {details.map((detail) => (
                <div key={detail.label} className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">{detail.label}</span>
                  <span className="text-right font-medium text-card-foreground">{detail.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export function VersionCompareDialog({
  open,
  onClose,
  versions,
  baseVersionId,
}: {
  open: boolean;
  onClose: () => void;
  versions: ResumeVersion[];
  baseVersionId?: string;
}) {
  const [leftId, setLeftId] = useState(baseVersionId ?? versions[0]?.id ?? '');
  const [rightId, setRightId] = useState(versions[1]?.id ?? versions[0]?.id ?? '');
  const left = versions.find((version) => version.id === leftId) ?? versions[0];
  const right = versions.find((version) => version.id === rightId) ?? versions[1] ?? versions[0];

  const diff = useMemo(() => compareResumeContent(left?.content, right?.content), [left, right]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Compare Versions"
      description="Review what changed between two generated resumes."
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Select value={leftId} onChange={(e) => setLeftId(e.target.value)}>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                Version {version.versionNumber}
              </option>
            ))}
          </Select>
          <Select value={rightId} onChange={(e) => setRightId(e.target.value)}>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                Version {version.versionNumber}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <VersionColumn title={`Version ${left?.versionNumber ?? '-'}`} tone="default" content={left} />
          <VersionColumn title={`Version ${right?.versionNumber ?? '-'}`} tone="primary" content={right} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-card-foreground">Added / Removed / Changed</p>
          <div className="space-y-3">
            {diff.added.map((item) => (
              <DiffLine key={item} tone="added" text={item} />
            ))}
            {diff.removed.map((item) => (
              <DiffLine key={item} tone="removed" text={item} />
            ))}
            {diff.changed.map((item) => (
              <DiffLine key={item.before + item.after} tone="changed" text={`${item.before} → ${item.after}`} />
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function VersionColumn({
  title,
  tone,
  content,
}: {
  title: string;
  tone: 'default' | 'primary';
  content?: ResumeVersion;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-card-foreground">{title}</p>
        {content?.isCurrent && <Badge variant={tone === 'primary' ? 'primary' : 'success'}>Current</Badge>}
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <p className="text-muted-foreground">Score</p>
        <p className="text-lg font-semibold text-card-foreground">{content?.score ?? '-'} / 100</p>
        <p className="text-muted-foreground">ATS</p>
        <p className="text-lg font-semibold text-card-foreground">{content?.atsScore ?? '-'} / 100</p>
        {content?.changeSummary && (
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-muted-foreground">
            {content.changeSummary}
          </p>
        )}
      </div>
    </div>
  );
}

function DiffLine({
  tone,
  text,
}: {
  tone: 'added' | 'removed' | 'changed';
  text: string;
}) {
  const styles =
    tone === 'added'
      ? 'border-success/20 bg-success/10 text-success'
      : tone === 'removed'
        ? 'border-destructive/20 bg-destructive/10 text-destructive'
        : 'border-warning/20 bg-warning/10 text-warning';

  return <div className={`rounded-xl border px-3 py-2 text-sm ${styles}`}>{text}</div>;
}

function compareResumeContent(left?: Record<string, unknown>, right?: Record<string, unknown> | null) {
  const leftSkills = new Set(normalizeStrings(left?.skills));
  const rightSkills = new Set(normalizeStrings(right?.skills));
  const added = [...rightSkills].filter((item) => !leftSkills.has(item));
  const removed = [...leftSkills].filter((item) => !rightSkills.has(item));
  const changed: Array<{ before: string; after: string }> = [];

  const leftSummary = extractText(left?.summary);
  const rightSummary = extractText(right?.summary);
  if (leftSummary && rightSummary && leftSummary !== rightSummary) {
    changed.push({ before: leftSummary, after: rightSummary });
  }

  return { added, removed, changed };
}

function normalizeStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function extractText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
