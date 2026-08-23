import { AlertTriangle, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

export function LoadingState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border bg-card p-8">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-base font-semibold text-card-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = FolderOpen,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <p className="mt-4 text-base font-semibold text-card-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  details,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  details?: string;
}) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-destructive/10 p-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-card-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {details && <p className="mt-2 text-xs text-muted-foreground">{details}</p>}
          {onRetry && (
            <div className="mt-4">
              <Button onClick={onRetry} variant="secondary">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
