import { useState } from 'react';
import { ChevronDown, FileJson, X } from 'lucide-react';
import type { BuildDetails as BuildDetailsType } from '../../types/flakyTest';
import { formatFileSize } from '../../utils/fileValidation';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';

interface BuildDetailsProps {
  build1: { details: BuildDetailsType; content: string } | undefined;
  build2: { details: BuildDetailsType; content: string } | undefined;
}

function BuildDetailBlock({
  label,
  details,
  content,
}: {
  label: string;
  details: BuildDetailsType;
  content: string;
}) {
  const [jsonOpen, setJsonOpen] = useState(false);

  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <StatusBadge tone={details.validationStatus === 'valid' ? 'success' : 'error'}>
          {details.validationStatus === 'valid' ? 'Valid JSON' : 'Invalid JSON'}
        </StatusBadge>
      </div>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Filename</dt>
          <dd className="truncate font-medium text-slate-800">{details.fileName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Size</dt>
          <dd className="font-medium text-slate-800">{formatFileSize(details.fileSize)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Uploaded</dt>
          <dd className="font-medium text-slate-800">
            {new Date(details.uploadTimestamp).toLocaleString()}
          </dd>
        </div>
      </dl>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => setJsonOpen((value) => !value)}
        aria-expanded={jsonOpen}
      >
        <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
        {jsonOpen ? 'Hide JSON' : 'View JSON'}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${jsonOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </Button>
      {jsonOpen ? (
        <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
          {formatJson(content)}
        </pre>
      ) : null}
    </div>
  );
}

function formatJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

export function BuildDetails({ build1, build2 }: BuildDetailsProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="build-details-heading">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls="build-details-content"
      >
        <FileJson className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <div>
          <h2 id="build-details-heading" className="text-sm font-semibold text-slate-800">
            Build Details
          </h2>
          <p className="text-xs text-slate-500">Uploaded files and validation status</p>
        </div>
        <ChevronDown
          className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div id="build-details-content" className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-2">
          {build1 ? (
            <BuildDetailBlock label="Build 1" details={build1.details} content={build1.content} />
          ) : (
            <p className="text-sm text-slate-400">Build 1 not uploaded.</p>
          )}
          {build2 ? (
            <BuildDetailBlock label="Build 2" details={build2.details} content={build2.content} />
          ) : (
            <p className="text-sm text-slate-400">Build 2 not uploaded.</p>
          )}
        </div>
      ) : null}

      {open && (build1 || build2) ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">
            <X className="mr-1 inline h-3 w-3 align-text-bottom" aria-hidden="true" />
            Raw JSON is only visible when expanded — it is not exposed by default.
          </p>
        </div>
      ) : null}
    </section>
  );
}
