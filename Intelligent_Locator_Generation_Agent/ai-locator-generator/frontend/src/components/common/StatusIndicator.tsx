interface StatusIndicatorProps {
  ok: boolean;
  label?: string;
  detail?: string;
}

export function StatusIndicator({ ok, label, detail }: StatusIndicatorProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5"
      title={detail ? `${label} — ${detail}` : label}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "status-pulse bg-success" : "bg-warning"}`}
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-ink">{ok ? "Connected" : "Offline"}</span>
      {label && <span className="text-xs text-muted">{label}</span>}
    </div>
  );
}
