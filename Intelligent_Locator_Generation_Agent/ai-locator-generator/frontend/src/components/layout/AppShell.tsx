import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-bg text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--glow)_0%,transparent_100%)]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
