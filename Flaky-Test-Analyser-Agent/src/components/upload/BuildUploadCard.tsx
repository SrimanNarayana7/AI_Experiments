import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, FileJson, RefreshCw, UploadCloud, X, XCircle } from 'lucide-react';
import type { BuildSlot, UploadedBuild } from '../../types/flakyTest';
import { formatFileSize } from '../../utils/fileValidation';

interface BuildUploadCardProps {
  slot: BuildSlot;
  label: string;
  description: string;
  build: UploadedBuild | undefined;
  disabled?: boolean;
  onUpload: (slot: BuildSlot, file: File) => void;
  onRemove: (slot: BuildSlot) => void;
}

export function BuildUploadCard({
  slot,
  label,
  description,
  build,
  disabled,
  onUpload,
  onRemove,
}: BuildUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) {
        return;
      }
      onUpload(slot, file);
    },
    [slot, onUpload],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      handleFile(event.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const hasFile = build !== undefined;
  const isValid = build?.valid === true;

  return (
    <section
      className={`rounded-lg border bg-white shadow-sm ${
        dragging ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200'
      }`}
      aria-label={`${label} upload card`}
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{label}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>

      <div className="p-4">
        {!hasFile ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={`Upload ${label} result.json`}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-4 py-8 text-center transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <UploadCloud className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">Drag &amp; drop result.json here</p>
            <p className="text-xs text-slate-400">or</p>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Browse Files
            </span>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <FileJson className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{build.file.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(build.size)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                  aria-label={`Replace ${label} file`}
                  title="Replace file"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(slot)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove ${label} file`}
                  title="Remove file"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              {isValid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  <span className="text-xs font-medium text-emerald-700">Valid JSON</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                  <span className="text-xs font-medium text-red-700">Invalid JSON</span>
                  <span className="text-xs text-red-600">
                    Please upload a valid Playwright result.json.
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          disabled={disabled}
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
    </section>
  );
}
