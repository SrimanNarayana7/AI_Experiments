import { prisma } from '../../prisma';
import type { JobAnalysis, SkillMatch } from '@repo/shared';

export class AnalysisService {
  async saveJobAnalysis(
    jobId: string,
    analysis: {
      requiredSkills: string[];
      preferredSkills: string[];
      responsibilities: string[];
      qualifications: string[];
      keywords: string[];
      roleSummary: string;
      experienceLevel?: string;
    },
  ): Promise<JobAnalysis> {
    await prisma.jobAnalysis.deleteMany({ where: { jobId } });

    const saved = await prisma.jobAnalysis.create({
      data: {
        jobId,
        requiredSkills: analysis.requiredSkills,
        preferredSkills: analysis.preferredSkills,
        responsibilities: analysis.responsibilities,
        qualifications: analysis.qualifications,
        keywords: analysis.keywords,
        roleSummary: analysis.roleSummary,
        experienceLevel: analysis.experienceLevel ?? null,
      },
    });

    return this.mapAnalysis(saved);
  }

  async getByJob(jobId: string): Promise<JobAnalysis | null> {
    const analysis = await prisma.jobAnalysis.findUnique({ where: { jobId } });
    return analysis ? this.mapAnalysis(analysis) : null;
  }

  async saveSkillMatches(
    jobId: string,
    matches: Array<{
      jobId: string;
      skill: string;
      category: 'REQUIRED' | 'PREFERRED';
      status: 'MATCHED' | 'PARTIAL' | 'MISSING';
      evidence?: string | null;
    }>,
  ): Promise<SkillMatch[]> {
    await prisma.skillMatch.deleteMany({ where: { jobId } });

    await prisma.skillMatch.createMany({
      data: matches.map((m) => ({
        jobId,
        skill: m.skill,
        category: m.category,
        status: m.status,
        evidence: m.evidence ?? null,
      })),
    });

    const results = await prisma.skillMatch.findMany({ where: { jobId } });
    return results.map((m) => this.mapSkillMatch(m));
  }

  async getSkillMatches(jobId: string): Promise<SkillMatch[]> {
    const matches = await prisma.skillMatch.findMany({ where: { jobId } });
    return matches.map((m) => this.mapSkillMatch(m));
  }

  private mapAnalysis(analysis: {
    id: string;
    jobId: string;
    requiredSkills: string[];
    preferredSkills: string[];
    responsibilities: string[];
    qualifications: string[];
    keywords: string[];
    roleSummary: string;
    experienceLevel: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): JobAnalysis {
    return {
      ...analysis,
      experienceLevel: analysis.experienceLevel ?? undefined,
      createdAt: analysis.createdAt.toISOString(),
      updatedAt: analysis.updatedAt.toISOString(),
    };
  }

  private mapSkillMatch(match: {
    id: string;
    jobId: string;
    skill: string;
    category: string;
    status: string;
    evidence: string | null;
    createdAt: Date;
  }): SkillMatch {
    return {
      id: match.id,
      jobId: match.jobId,
      skill: match.skill,
      category: match.category as SkillMatch['category'],
      status: match.status as SkillMatch['status'],
      evidence: match.evidence ?? undefined,
      createdAt: match.createdAt.toISOString(),
    };
  }
}
