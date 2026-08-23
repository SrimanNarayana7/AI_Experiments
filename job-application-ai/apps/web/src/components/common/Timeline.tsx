import type { TimelineEvent } from '@repo/shared';
import { Badge } from '../ui/Badge';

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        No timeline events yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="flex gap-4">
          <div className="mt-1.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-primary">
            <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
          </div>
          <div className="flex-1 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-card-foreground">{event.title}</p>
              <Badge variant="info">{event.type.replace(/_/g, ' ')}</Badge>
            </div>
            {event.description && (
              <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(event.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
