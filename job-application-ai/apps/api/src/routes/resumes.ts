import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CreateMasterResumeSchema } from '@repo/shared';
import { ResumeService } from '../services/jobs/ResumeService';
import { LocalStorageService } from '../services/storage/LocalStorageService';
import { PDFService } from '../services/pdf/PDFService';
import { env } from '../config';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { sanitizeFilename } from '../utils/fileHelpers';
import { processUploadedResume } from '../utils/resumeUpload';

const resumeService = new ResumeService();
const storageService = new LocalStorageService(`${env.STORAGE_PATH}/resumes`);
const pdfService = new PDFService();

export async function resumeRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = CreateMasterResumeSchema.parse(request.body) as any;
    const resume = await resumeService.createMaster({
      ...input,
      sourceType: input.sourceType ?? 'manual',
    });
    return reply.status(201).send({ success: true, data: resume });
  });

  app.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const file = await request.file();
    if (!file) throw new AppError(400, 'Please upload a PDF or DOCX resume.', 'INVALID_UPLOAD');

    const buffer = await file.toBuffer();
    const payload = await processUploadedResume({
      buffer,
      filename: file.filename,
      mimeType: file.mimetype,
      storageService,
      storageFolder: 'master',
    });

    const resume = await resumeService.createMaster(payload);
    return reply.status(201).send({ success: true, data: resume });
  });

  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const resumes = await resumeService.listMasters();
    return reply.send({ success: true, data: resumes });
  });

  app.get('/library', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string | undefined>;
    const search = (query.search ?? '').trim().toLowerCase();
    const companyFilter = (query.company ?? '').trim().toLowerCase();
    const roleFilter = (query.role ?? '').trim().toLowerCase();
    const versionFilter = query.version ? Number(query.version) : undefined;
    const sort = query.sort ?? 'newest';

    const masterResumes = await resumeService.listMasters();
    const jobs = await prisma.job.findMany({
      where: { deletedAt: null },
      include: {
        resumeVersions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    const companyResumes = jobs.flatMap((job) =>
      job.resumeVersions
        .filter((version) => (versionFilter ? version.versionNumber === versionFilter : true))
        .map((version) => ({
          id: version.id,
          type: 'COMPANY' as const,
          jobId: job.id,
          company: job.company,
          title: job.title,
          versionNumber: version.versionNumber,
          score: version.score ?? undefined,
          atsScore: version.atsScore ?? undefined,
          filename: version.pdfPath ? version.pdfPath.split(/[\\/]/).pop() ?? undefined : undefined,
          originalFilename: undefined,
          mimeType: 'application/pdf',
          fileSize: undefined,
          storagePath: version.pdfPath ?? undefined,
          isCurrent: version.isCurrent,
          createdAt: version.createdAt.toISOString(),
          updatedAt: version.updatedAt.toISOString(),
        })),
    );

    const masterItems = masterResumes.map((resume) => ({
      id: resume.id,
      type: 'MASTER' as const,
      jobId: null,
      company: null,
      title: resume.name,
      versionNumber: null,
      score: null,
      atsScore: null,
      filename: resume.originalFilename ?? `${sanitizeFilename(resume.name)}.pdf`,
      originalFilename: resume.originalFilename,
      mimeType: resume.mimeType ?? undefined,
      fileSize: resume.fileSize ?? undefined,
      storagePath: resume.storagePath ?? undefined,
      isCurrent: resume.isActive,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    }));

    let items = [...masterItems, ...companyResumes];
    if (search) {
      items = items.filter((item) =>
        [item.company, item.title, item.filename, item.originalFilename]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(search)),
      );
    }
    if (companyFilter) {
      items = items.filter((item) => item.company?.toLowerCase().includes(companyFilter));
    }
    if (roleFilter) {
      items = items.filter((item) => item.title?.toLowerCase().includes(roleFilter));
    }
    if (query.type) {
      items = items.filter((item) => item.type === query.type);
    }

    items.sort((a, b) => {
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === 'highest-score') return (b.score ?? -1) - (a.score ?? -1);
      if (sort === 'lowest-score') return (a.score ?? 101) - (b.score ?? 101);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const recentDocuments = items.slice(0, 8);

    return reply.send({
      success: true,
      data: {
        masterResume: masterResumes[0] ?? null,
        masterResumes,
        companyResumes,
        recentDocuments,
      },
    });
  });

  app.get('/active', async (_request: FastifyRequest, reply: FastifyReply) => {
    const resume = await resumeService.getActiveMaster();
    if (!resume) throw new AppError(404, 'No active master resume found', 'NOT_FOUND');
    return reply.send({ success: true, data: resume });
  });

  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const resume = await resumeService.getMaster(id);
    if (!resume) throw new AppError(404, 'Resume not found', 'NOT_FOUND');
    return reply.send({ success: true, data: resume });
  });

  app.get('/:id/download', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const resume = await resumeService.getMaster(id);
    if (!resume) throw new AppError(404, 'Resume not found', 'NOT_FOUND');

    let buffer: Buffer;
    let filename: string;

    if (resume.storagePath && (await storageService.exists(resume.storagePath))) {
      buffer = await storageService.read(resume.storagePath);
      filename = resume.originalFilename ?? `${sanitizeFilename(resume.name)}.pdf`;
    } else {
      buffer = await pdfService.generateMasterResumeDocument(resume.name, resume.rawText);
      filename = `${sanitizeFilename(resume.name)}.pdf`;
    }

    return reply
      .header('Content-Type', resume.mimeType ?? 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${sanitizeFilename(filename)}"`)
      .send(buffer);
  });

  app.get('/:id/preview', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const resume = await resumeService.getMaster(id);
    if (!resume) throw new AppError(404, 'Resume not found', 'NOT_FOUND');

    const buffer =
      resume.storagePath && (await storageService.exists(resume.storagePath))
        ? await storageService.read(resume.storagePath)
        : await pdfService.generateMasterResumeDocument(resume.name, resume.rawText);

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${sanitizeFilename(resume.name)}.pdf"`)
      .send(buffer);
  });

  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const resume = await resumeService.getMaster(id);
    if (!resume) throw new AppError(404, 'Resume not found', 'NOT_FOUND');

    if (resume.storagePath && (await storageService.exists(resume.storagePath))) {
      await storageService.delete(resume.storagePath);
    }
    await resumeService.deleteMaster(id);
    return reply.send({ success: true, message: 'Resume deleted' });
  });

  app.post('/:id/replace', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await resumeService.getMaster(id);
    if (!existing) throw new AppError(404, 'Resume not found', 'NOT_FOUND');

    const file = await request.file();
    if (!file) throw new AppError(400, 'Please upload a PDF or DOCX resume.', 'INVALID_UPLOAD');

    const buffer = await file.toBuffer();
    const payload = await processUploadedResume({
      buffer,
      filename: file.filename,
      mimeType: file.mimetype,
      storageService,
      storageFolder: 'master',
    });

    if (existing.storagePath && (await storageService.exists(existing.storagePath))) {
      await storageService.delete(existing.storagePath);
    }

    const updated = await resumeService.updateMaster(id, {
      ...payload,
      isActive: true,
    });

    return reply.send({ success: true, data: updated });
  });

  app.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const input = CreateMasterResumeSchema.partial().parse(request.body) as any;
    const resume = await resumeService.updateMaster(id, input);
    return reply.send({ success: true, data: resume });
  });
}
