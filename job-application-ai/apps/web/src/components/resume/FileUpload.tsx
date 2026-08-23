import { UploadCloud, FileText } from 'lucide-react';

export function FileUpload({
  label,
  hint,
  onChange,
  accept,
  multiple = false,
}: {
  label: string;
  hint: string;
  onChange: (file: File | null) => void;
  accept: string;
  multiple?: boolean;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 px-6 py-10 text-center transition hover:border-primary/40 hover:bg-muted/60">
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <UploadCloud className="h-8 w-8 text-primary" />
      <p className="mt-4 text-base font-semibold text-card-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        PDF and DOCX supported
      </div>
    </label>
  );
}
