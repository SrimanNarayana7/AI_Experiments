import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({ title = 'Loading', description }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}
