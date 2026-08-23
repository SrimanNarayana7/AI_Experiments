import { prisma } from '../../prisma';
import type { CreateJobInput, UpdateJobInput, UpdateJobStatusInput, Job } from '@repo/shared';

export class JobService {
  async create(input: CreateJobInput): Promise<Job> {
    const job = await prisma.job.create({
      data: {
        company: input.company,
        title: input.title,
        url: input.url ?? null,
        location: input.location ?? null,
        employmentType: input.employmentType ?? null,
        salary: input.salary ?? null,
        priority: input.priority,
        description: input.description,
        status: input.status,
        appliedAt: input.status === 'APPLIED' ? new Date() : null,
      },
    });

    await prisma.timelineEvent.create({
      data: {
        jobId: job.id,
        type: 'CREATED',
        title: 'Job created',
        description: `Created ${input.title} at ${input.company}`,
      },
    });

    return this.mapJob(job);
  }

  async list(filters?: {
    status?: string;
    company?: string;
    priority?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Job[]> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (filters?.status) where.status = filters.status;
    if (filters?.company) where.company = { contains: filters.company, mode: 'insensitive' };
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.search) {
      where.OR = [
        { company: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, string> = {};
    if (filters?.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder ?? 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      include: {
        analysis: true,
        skillMatches: true,
        resumeVersions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
    return jobs.map((job) => this.mapJob(job));
  }

  async getById(id: string): Promise<Job | null> {
    const job = await prisma.job.findFirst({
      where: { id, deletedAt: null },
      include: {
        analysis: true,
        skillMatches: true,
        resumeVersions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
    return job ? this.mapJob(job) : null;
  }

  async update(id: string, input: UpdateJobInput): Promise<Job> {
    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(input.company !== undefined && { company: input.company }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.employmentType !== undefined && { employmentType: input.employmentType }),
        ...(input.salary !== undefined && { salary: input.salary }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });

    return this.mapJob(job);
  }

  async updateStatus(id: string, input: UpdateJobStatusInput): Promise<Job> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Job not found');

    const job = await prisma.job.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.status === 'APPLIED' && !existing.appliedAt ? { appliedAt: new Date() } : {}),
      },
    });

    await prisma.timelineEvent.create({
      data: {
        jobId: id,
        type: 'STATUS_CHANGED',
        title: 'Status changed',
        description: `Moved from ${existing.status} to ${input.status}`,
        metadata: { from: existing.status, to: input.status },
      },
    });

    return this.mapJob(job);
  }

  async delete(id: string): Promise<void> {
    await prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private mapJob(job: {
    id: string;
    company: string;
    title: string;
    url: string | null;
    location: string | null;
    employmentType: string | null;
    salary: string | null;
    priority: string;
    description: string;
    status: string;
    score: number | null;
    atsScore: number | null;
    appliedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    analysis?: { requiredSkills: string[] } | null;
    skillMatches?: Array<{ skill: string; status: string }>;
    resumeVersions?: Array<{ versionNumber: number }>;
  }): Job {
    const topSkills =
      job.skillMatches?.filter((match) => match.status === 'MATCHED').map((match) => match.skill).slice(0, 3) ??
      job.analysis?.requiredSkills.slice(0, 3) ??
      [];
    const latestResumeVersion = job.resumeVersions?.[0]?.versionNumber ?? null;

    return {
      id: job.id,
      company: job.company,
      title: job.title,
      url: job.url ?? undefined,
      location: job.location ?? undefined,
      employmentType: (job.employmentType as Job['employmentType']) ?? undefined,
      salary: job.salary ?? undefined,
      priority: job.priority as Job['priority'],
      description: job.description,
      status: job.status as Job['status'],
      score: job.score ?? undefined,
      atsScore: job.atsScore ?? undefined,
      appliedAt: job.appliedAt ? job.appliedAt.toISOString() : undefined,
      topSkills,
      latestResumeVersion,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
