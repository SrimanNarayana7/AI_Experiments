import { prisma } from '../../prisma';
import type { CreateTimelineEventInput, TimelineEvent } from '@repo/shared';

export class TimelineService {
  async create(input: CreateTimelineEventInput): Promise<TimelineEvent> {
    const event = await prisma.timelineEvent.create({
      data: {
        jobId: input.jobId,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        metadata: (input.metadata ?? null) as never,
      },
    });
    return this.mapEvent(event);
  }

  async listByJob(jobId: string): Promise<TimelineEvent[]> {
    const events = await prisma.timelineEvent.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });
    return events.map((e) => this.mapEvent(e));
  }

  private mapEvent(event: {
    id: string;
    jobId: string;
    type: string;
    title: string;
    description: string | null;
    metadata: unknown | null;
    createdAt: Date;
  }): TimelineEvent {
    return {
      id: event.id,
      jobId: event.jobId,
      type: event.type as TimelineEvent['type'],
      title: event.title,
      description: event.description ?? undefined,
      metadata: (event.metadata as Record<string, unknown>) ?? undefined,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
