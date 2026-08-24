import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CreateMasterResumeSchema, type MasterResume } from '@repo/shared';
import { ResumeService } from '../services/jobs/ResumeService';
import { LocalStorageService } from '../services/storage/LocalStorageService';
import { PDFService } from '../services/pdf/PDFService';
import { env } from '../config';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { sanitizeFilename } from '../utils/fileHelpers';
import { processUploadedResume } from '../utils/resumeUpload';
import { detectResumeDocumentType } from '../utils/documentExtraction';

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
    if (!file || file.fieldname !== 'file') {
      throw new AppError(400, 'Please upload a PDF or DOCX resume.', 'INVALID_UPLOAD');
    }

    const payload = await processUploadedResume({
      buffer: await file.toBuffer(),
      filename: file.filename,
      mimeType: file.mimetype,
      storageService,
      storageFolder: 'master',
    });

    try {
      const resume = await resumeService.createMaster(payload);
      return reply.status(201).send({ success: true, data: resume });
    } catch (error) {
      await storageService.delete(payload.storagePath).catch(() => undefined);
      throw error;
    }
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

    const [masterResumes, activeMaster] = await Promise.all([
      resumeService.listMasters(),
      resumeService.getActiveMaster(),
    ]);
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
        masterResume: activeMaster,
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

    const hasStoredFile = Boolean(
      resume.storagePath && (await storageService.exists(resume.storagePath)),
    );
    const buffer = hasStoredFile
      ? await storageService.read(resume.storagePath as string)
      : await pdfService.generateMasterResumeDocument(resume.name, resume.rawText);
    const filename = hasStoredFile
      ? resume.originalFilename ?? `${sanitizeFilename(resume.name)}.pdf`
      : `${sanitizeFilename(resume.name)}.pdf`;
    const contentType = hasStoredFile ? resume.mimeType ?? 'application/octet-stream' : 'application/pdf';

    return reply
      .header('Content-Type', contentType)
      .header('Content-Disposition', `attachment; filename="${sanitizeFilename(filename)}"`)
      .send(buffer);
  });

  app.get('/:id/preview', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const resume = await resumeService.getMaster(id);
    if (!resume) throw new AppError(404, 'Resume not found', 'NOT_FOUND');

    const documentType = detectResumeDocumentType(
      resume.originalFilename ?? undefined,
      resume.mimeType ?? undefined,
    );
    const canPreviewStoredPdf = documentType === 'PDF' && resume.storagePath
      && (await storageService.exists(resume.storagePath));
    const buffer = canPreviewStoredPdf
      ? await storageService.read(resume.storagePath as string)
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
    if (!file || file.fieldname !== 'file') {
      throw new AppError(400, 'Please upload a PDF or DOCX resume.', 'INVALID_UPLOAD');
    }

    const payload = await processUploadedResume({
      buffer: await file.toBuffer(),
      filename: file.filename,
      mimeType: file.mimetype,
      storageService,
      storageFolder: 'master',
    });

    let updated: MasterResume;
    try {
      updated = await resumeService.updateMaster(id, {
        ...payload,
        isActive: true,
      });
    } catch (error) {
      await storageService.delete(payload.storagePath).catch(() => undefined);
      throw error;
    }

    if (
      existing.storagePath
      && existing.storagePath !== payload.storagePath
      && (await storageService.exists(existing.storagePath))
    ) {
      await storageService.delete(existing.storagePath);
    }

    return reply.send({ success: true, data: updated });
  });

  app.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const input = CreateMasterResumeSchema.partial().parse(request.body) as any;
    const resume = await resumeService.updateMaster(id, input);
    return reply.send({ success: true, data: resume });
  });
}
