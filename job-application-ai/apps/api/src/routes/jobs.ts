import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CreateJobSchema,
  UpdateJobSchema,
  UpdateJobStatusSchema,
  CreateTimelineEventSchema,
  CreateNoteSchema,
  JobStatus,
} from '@repo/shared';
import { JobService } from '../services/jobs/JobService';
import { AnalysisService } from '../services/jobs/AnalysisService';
import { TimelineService } from '../services/jobs/TimelineService';
import { ResumeService } from '../services/jobs/ResumeService';
import { DeepSeekResumeService } from '../services/ai/DeepSeekResumeService';
import { DeepSeekClient } from '../services/ai/DeepSeekClient';
import { PDFService } from '../services/pdf/PDFService';
import { LocalStorageService } from '../services/storage/LocalStorageService';
import { env } from '../config';
import { AppError } from '../middleware/errorHandler';
import { sanitizeFilename } from '../utils/fileHelpers';
import { prisma } from '../prisma';

const jobService = new JobService();
const analysisService = new AnalysisService();
const timelineService = new TimelineService();
const resumeService = new ResumeService();
const pdfService = new PDFService();
const storageService = new LocalStorageService(`${env.STORAGE_PATH}/resumes`);

function getAIService(): DeepSeekResumeService {
  return new DeepSeekResumeService(new DeepSeekClient());
}

export async function jobRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = CreateJobSchema.parse(request.body);
    const job = await jobService.create(input);
    return reply.status(201).send({ success: true, data: job });
  });

  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string | undefined>;
    const jobs = await jobService.list({
      status: query.status,
      company: query.company,
      priority: query.priority,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
    });
    return reply.send({ success: true, data: jobs });
  });

  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const job = await jobService.getById(id);
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');
    return reply.send({ success: true, data: job });
  });

  app.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const input = UpdateJobSchema.parse(request.body);
    const job = await jobService.update(id, input);
    return reply.send({ success: true, data: job });
  });

  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await jobService.delete(id);
    return reply.send({ success: true, message: 'Job deleted' });
  });

  app.patch('/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const input = UpdateJobStatusSchema.parse(request.body);
    const job = await jobService.updateStatus(id, input);
    return reply.send({ success: true, data: job });
  });

  app.post('/:id/analyze', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const job = await jobService.getById(id);
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

    const ai = getAIService();
    const analysis = await ai.analyzeJob(job.description);
    const savedAnalysis = await analysisService.saveJobAnalysis(id, analysis);

    await timelineService.create({
      jobId: id,
      type: 'ANALYZED',
      title: 'JD analyzed',
      description: `Extracted ${analysis.requiredSkills.length} required and ${analysis.preferredSkills.length} preferred skills`,
    });

    return reply.send({ success: true, data: savedAnalysis });
  });

  app.post('/:id/analyze-resume', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const job = await jobService.getById(id);
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

    const master = await resumeService.getActiveMaster();
    if (!master) throw new AppError(400, 'No active master resume found', 'NO_RESUME');

    const ai = getAIService();
    const jdAnalysis = await ai.analyzeJob(job.description);
    const resumeAnalysis = await ai.analyzeResume(master);
    const match = await ai.matchResumeToJob(jdAnalysis, resumeAnalysis);

    const matches = [
      ...match.matchedSkills.map((m: { skill: string; evidence?: string }) => ({
        jobId: id,
        skill: m.skill,
        category: 'REQUIRED' as const,
        status: 'MATCHED' as const,
        evidence: m.evidence ?? null,
      })),
      ...match.partialSkills.map((m: { skill: string; evidence?: string }) => ({
        jobId: id,
        skill: m.skill,
        category: 'REQUIRED' as const,
        status: 'PARTIAL' as const,
        evidence: m.evidence ?? null,
      })),
      ...match.missingSkills.map((s: string) => ({
        jobId: id,
        skill: s,
        category: 'REQUIRED' as const,
        status: 'MISSING' as const,
        evidence: null,
      })),
    ];

    await analysisService.saveSkillMatches(id, matches);
    await analysisService.saveJobAnalysis(id, jdAnalysis);

    return reply.send({
      success: true,
      data: {
        jdAnalysis,
        resumeAnalysis,
        matchAnalysis: match,
        skillMatches: matches,
      },
    });
  });

  app.post('/:id/generate-resume', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const job = await jobService.getById(id);
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

    const master = await resumeService.getActiveMaster();
    if (!master) throw new AppError(400, 'No active master resume found', 'NO_RESUME');

    const versions = await resumeService.getVersionsByJob(id);
    const nextVersion = versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) + 1 : 1;

    const ai = getAIService();
    const result = await ai.generateResume(job, master, nextVersion);

    const pdfBuffer = await pdfService.generateResume(
      result.optimized,
      job.company,
      job.title,
      nextVersion,
    );

    const filename = sanitizeFilename(`${job.company}_${job.title}_Resume_v${nextVersion}.pdf`);
    const pdfPath = await storageService.save(filename, pdfBuffer);

    const version = await resumeService.createVersion(
      id,
      master.id,
      nextVersion,
      result.optimized as Record<string, unknown>,
      result.scoreBreakdown.total,
      result.scoreBreakdown.atsReadability,
      result.scoreBreakdown,
      result.optimized.changes.join('\n'),
      pdfPath,
    );

    await prisma.job.update({
      where: { id },
      data: { score: result.scoreBreakdown.total, atsScore: result.scoreBreakdown.atsReadability },
    });

    await timelineService.create({
      jobId: id,
      type: 'RESUME_GENERATED',
      title: 'Resume generated',
      description: `Version ${nextVersion} created with score ${result.scoreBreakdown.total}`,
      metadata: { versionId: version.id, score: result.scoreBreakdown.total },
    });

    return reply.send({ success: true, data: version });
  });

  app.get('/:id/resume-versions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const versions = await resumeService.getVersionsByJob(id);
    return reply.send({ success: true, data: versions });
  });

  app.post('/:id/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const input = CreateTimelineEventSchema.parse({ ...(request.body as object), jobId: id });
    const event = await timelineService.create(input);
    return reply.status(201).send({ success: true, data: event });
  });

  app.get('/:id/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const events = await timelineService.listByJob(id);
    return reply.send({ success: true, data: events });
  });

  app.post('/:id/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const input = CreateNoteSchema.parse({ ...(request.body as object), jobId: id });
    const note = await prisma.note.create({
      data: {
        jobId: id,
        content: input.content,
      },
    });
    return reply.status(201).send({
      success: true,
      data: {
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    });
  });

  app.get('/:id/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const notes = await prisma.note.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({
      success: true,
      data: notes.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    });
  });
}
