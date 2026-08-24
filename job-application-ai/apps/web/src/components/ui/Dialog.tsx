import type { PropsWithChildren, ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
}>) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_32px_96px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
