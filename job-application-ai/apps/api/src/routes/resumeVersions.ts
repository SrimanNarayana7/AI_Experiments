import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ResumeService } from '../services/jobs/ResumeService';
import { LocalStorageService } from '../services/storage/LocalStorageService';
import { PDFService } from '../services/pdf/PDFService';
import { env } from '../config';
import { AppError } from '../middleware/errorHandler';
import { sanitizeFilename } from '../utils/fileHelpers';
import { prisma } from '../prisma';

const resumeService = new ResumeService();
const storageService = new LocalStorageService(`${env.STORAGE_PATH}/resumes`);
const pdfService = new PDFService();

export async function resumeVersionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const version = await resumeService.getVersion(id);
    if (!version) throw new AppError(404, 'Resume version not found', 'NOT_FOUND');
    return reply.send({ success: true, data: version });
  });

  app.post('/:id/generate-pdf', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const version = await prisma.resumeVersion.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!version) throw new AppError(404, 'Resume version not found', 'NOT_FOUND');

    const optimized = (version.optimizedContent ?? version.content) as {
      summary: string;
      skills: string[];
      experience: Array<{ title: string; company: string; duration: string; highlights: string[] }>;
      education: Array<{ degree: string; institution: string; year: string }>;
      certifications?: string[];
      changes: string[];
    };

    const pdfBuffer = await pdfService.generateResume(
      optimized,
      version.job.company,
      version.job.title,
      version.versionNumber,
    );

    const filename = sanitizeFilename(
      `${version.job.company}_${version.job.title}_Resume_v${version.versionNumber}.pdf`,
    );
    const pdfPath = await storageService.save(filename, pdfBuffer);

    const updated = await prisma.resumeVersion.update({
      where: { id },
      data: { pdfPath },
    });

    return reply.send({ success: true, data: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } });
  });

  app.get('/:id/pdf', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const version = await resumeService.getVersion(id);
    if (!version || !version.pdfPath) throw new AppError(404, 'PDF not found', 'NOT_FOUND');

    const buffer = await storageService.read(version.pdfPath);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${sanitizeFilename(version.pdfPath)}"`)
      .send(buffer);
  });

  app.get('/:id/download', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const version = await resumeService.getVersion(id);
    if (!version || !version.pdfPath) throw new AppError(404, 'PDF not found', 'NOT_FOUND');

    const buffer = await storageService.read(version.pdfPath);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${sanitizeFilename(version.pdfPath)}"`)
      .send(buffer);
  });

  app.get('/:id/preview', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const version = await resumeService.getVersion(id);
    if (!version || !version.pdfPath) throw new AppError(404, 'PDF not found', 'NOT_FOUND');

    const buffer = await storageService.read(version.pdfPath);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${sanitizeFilename(version.pdfPath)}"`)
      .send(buffer);
  });

  app.post('/:id/make-current', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const version = await resumeService.setCurrentVersion(id);
    return reply.send({ success: true, data: version });
  });
}
