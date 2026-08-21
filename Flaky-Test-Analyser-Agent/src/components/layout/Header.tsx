import { Activity, Settings } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';

interface HeaderProps {
  connected: boolean;
  onOpenSettings?: () => void;
}

export function Header({ connected, onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">Flaky Test Analyzer</p>
            <p className="text-[11px] leading-tight text-slate-500">Test Reliability Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge tone={connected ? 'success' : 'error'}>
            <span
              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                connected ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              aria-hidden="true"
            />
            {connected ? 'Langflow Connected' : 'Langflow Unavailable'}
          </StatusBadge>
          {onOpenSettings ? (
            <Button
              variant="ghost"
              onClick={onOpenSettings}
              aria-label="Open settings"
              title="Settings"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
