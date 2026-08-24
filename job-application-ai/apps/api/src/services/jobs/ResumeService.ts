import { prisma } from '../../prisma';
import type { CreateMasterResumeInput, MasterResume, ResumeVersion } from '@repo/shared';

export class ResumeService {
  async createMaster(input: CreateMasterResumeInput): Promise<MasterResume> {
    const resume = await prisma.$transaction(async (transaction) => {
      await transaction.masterResume.updateMany({ data: { isActive: false } });
      return transaction.masterResume.create({
        data: {
          name: input.name ?? 'Master Resume',
          content: input.content,
          rawText: input.rawText,
          originalFilename: input.originalFilename ?? null,
          mimeType: input.mimeType ?? null,
          fileSize: input.fileSize ?? null,
          storagePath: input.storagePath ?? null,
          extractedText: input.extractedText ?? null,
          sourceType: input.sourceType ?? 'manual',
          isActive: true,
        },
      });
    });

    return this.mapMaster(resume);
  }

  async listMasters(): Promise<MasterResume[]> {
    const resumes = await prisma.masterResume.findMany({ orderBy: { createdAt: 'desc' } });
    return resumes.map((r) => this.mapMaster(r));
  }

  async getMaster(id: string): Promise<MasterResume | null> {
    const resume = await prisma.masterResume.findUnique({ where: { id } });
    return resume ? this.mapMaster(resume) : null;
  }

  async getActiveMaster(): Promise<MasterResume | null> {
    const resume = await prisma.masterResume.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    return resume ? this.mapMaster(resume) : null;
  }

  async updateMaster(id: string, input: CreateMasterResumeInput): Promise<MasterResume> {
    const resume = await prisma.$transaction(async (transaction) => {
      if (input.isActive === true) {
        await transaction.masterResume.updateMany({
          where: { id: { not: id } },
          data: { isActive: false },
        });
      }

      return transaction.masterResume.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.content !== undefined && { content: input.content }),
          ...(input.rawText !== undefined && { rawText: input.rawText }),
          ...(input.originalFilename !== undefined && { originalFilename: input.originalFilename }),
          ...(input.mimeType !== undefined && { mimeType: input.mimeType }),
          ...(input.fileSize !== undefined && { fileSize: input.fileSize }),
          ...(input.storagePath !== undefined && { storagePath: input.storagePath }),
          ...(input.extractedText !== undefined && { extractedText: input.extractedText }),
          ...(input.sourceType !== undefined && { sourceType: input.sourceType }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });
    });
    return this.mapMaster(resume);
  }

  async deleteMaster(id: string): Promise<void> {
    await prisma.masterResume.delete({ where: { id } });
  }

  async createVersion(
    jobId: string,
    masterResumeId: string | undefined,
    versionNumber: number,
    content: Record<string, unknown>,
    score: number,
    atsScore: number,
    scoreBreakdown: Record<string, number>,
    changeSummary: string,
    pdfPath: string,
  ): Promise<ResumeVersion> {
    await prisma.resumeVersion.updateMany({
      where: { jobId },
      data: { isCurrent: false },
    });

    const version = await prisma.resumeVersion.create({
      data: {
        jobId,
        masterResumeId,
        versionNumber,
        content: content as never,
        optimizedContent: content as never,
        score,
        atsScore,
        scoreBreakdown: scoreBreakdown as never,
        changeSummary,
        isCurrent: true,
        pdfPath,
      },
    });

    return this.mapVersion(version);
  }

  async getVersionsByJob(jobId: string): Promise<ResumeVersion[]> {
    const versions = await prisma.resumeVersion.findMany({
      where: { jobId },
      orderBy: { versionNumber: 'desc' },
    });
    return versions.map((v) => this.mapVersion(v));
  }

  async getVersion(id: string): Promise<ResumeVersion | null> {
    const version = await prisma.resumeVersion.findUnique({ where: { id } });
    return version ? this.mapVersion(version) : null;
  }

  async setCurrentVersion(id: string): Promise<ResumeVersion> {
    const version = await prisma.resumeVersion.findUnique({ where: { id } });
    if (!version) throw new Error('Resume version not found');

    await prisma.resumeVersion.updateMany({
      where: { jobId: version.jobId },
      data: { isCurrent: false },
    });

    const updated = await prisma.resumeVersion.update({
      where: { id },
      data: { isCurrent: true },
    });

    return this.mapVersion(updated);
  }

  private mapMaster(resume: {
    id: string;
    name?: string;
    content: string;
    rawText: string;
    originalFilename?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    storagePath?: string | null;
    extractedText?: string | null;
    sourceType?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): MasterResume {
    return {
      ...resume,
      name: resume.name ?? 'Master Resume',
      originalFilename: resume.originalFilename ?? undefined,
      mimeType: resume.mimeType ?? undefined,
      fileSize: resume.fileSize ?? undefined,
      storagePath: resume.storagePath ?? undefined,
      extractedText: resume.extractedText ?? undefined,
      sourceType: resume.sourceType ?? undefined,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    };
  }

  private mapVersion(version: {
    id: string;
    jobId: string;
    masterResumeId: string | null;
    versionNumber: number;
    content: unknown;
    optimizedContent: unknown | null;
    score: number | null;
    atsScore: number | null;
    scoreBreakdown: unknown | null;
    changeSummary: string | null;
    isCurrent: boolean;
    pdfPath: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ResumeVersion {
    return {
      ...version,
      masterResumeId: version.masterResumeId ?? undefined,
      content: version.content as Record<string, unknown>,
      optimizedContent: (version.optimizedContent as Record<string, unknown>) ?? undefined,
      score: version.score ?? undefined,
      atsScore: version.atsScore ?? undefined,
      scoreBreakdown: (version.scoreBreakdown as Record<string, number>) ?? undefined,
      changeSummary: version.changeSummary ?? undefined,
      pdfPath: version.pdfPath ?? undefined,
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
    };
  }
}
