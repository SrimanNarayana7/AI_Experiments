import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../prisma';

const statusOrder: Record<string, number> = {
  BACKLOG: 0,
  SAVED: 1,
  APPLIED: 2,
  RECRUITER_SCREEN: 3,
  TECHNICAL_INTERVIEW: 4,
  FINAL_INTERVIEW: 5,
  OFFER: 6,
  REJECTED: 7,
};

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/dashboard', async (_request: FastifyRequest, reply: FastifyReply) => {
    const jobs = await prisma.job.findMany({
      where: { deletedAt: null },
      include: { resumeVersions: true },
    });

    const totalJobs = jobs.length;
    const savedJobs = jobs.filter((j) => j.status === 'SAVED').length;
    const applied = jobs.filter((j) => j.status === 'APPLIED').length;
    const recruiterScreens = jobs.filter((j) => j.status === 'RECRUITER_SCREEN').length;
    const technicalInterviews = jobs.filter((j) => j.status === 'TECHNICAL_INTERVIEW').length;
    const finalInterviews = jobs.filter((j) => j.status === 'FINAL_INTERVIEW').length;
    const offers = jobs.filter((j) => j.status === 'OFFER').length;
    const rejected = jobs.filter((j) => j.status === 'REJECTED').length;

    const scoredJobs = jobs.filter((j) => j.score !== null);
    const averageScore =
      scoredJobs.length > 0
        ? Math.round(scoredJobs.reduce((sum, j) => sum + (j.score ?? 0), 0) / scoredJobs.length)
        : null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const applicationsThisMonth = jobs.filter(
      (j) => new Date(j.createdAt) >= startOfMonth,
    ).length;

    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const applicationsPreviousMonth = jobs.filter((j) => {
      const created = new Date(j.createdAt);
      return created >= startOfPreviousMonth && created < startOfMonth;
    }).length;

    const interviews =
      technicalInterviews + finalInterviews + recruiterScreens + offers;
    const interviewConversionRate = totalJobs > 0 ? interviews / totalJobs : 0;
    const offerConversionRate = interviews > 0 ? offers / interviews : 0;

    const jobsByStatus: Record<string, number> = {};
    for (const status of Object.keys(statusOrder)) {
      jobsByStatus[status] = jobs.filter((j) => j.status === status).length;
    }

    const scoreDistribution = [
      { range: '0-49', count: scoredJobs.filter((j) => (j.score ?? 0) < 50).length },
      { range: '50-69', count: scoredJobs.filter((j) => (j.score ?? 0) >= 50 && (j.score ?? 0) < 70).length },
      { range: '70-79', count: scoredJobs.filter((j) => (j.score ?? 0) >= 70 && (j.score ?? 0) < 80).length },
      { range: '80-89', count: scoredJobs.filter((j) => (j.score ?? 0) >= 80 && (j.score ?? 0) < 90).length },
      { range: '90-100', count: scoredJobs.filter((j) => (j.score ?? 0) >= 90).length },
    ];

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0] ?? '';
    });

    const applicationsOverTime = last30Days.map((date) => ({
      date,
      count: jobs.filter((j) => j.createdAt.toISOString().startsWith(date)).length,
    }));

    const currentScoreJobs = jobs.filter((j) => j.createdAt >= startOfMonth && j.score !== null);
    const previousScoreJobs = jobs.filter(
      (j) => j.createdAt >= startOfPreviousMonth && j.createdAt < startOfMonth && j.score !== null,
    );
    const currentAverageScore =
      currentScoreJobs.length > 0
        ? Math.round(currentScoreJobs.reduce((sum, j) => sum + (j.score ?? 0), 0) / currentScoreJobs.length)
        : null;
    const previousAverageScore =
      previousScoreJobs.length > 0
        ? Math.round(previousScoreJobs.reduce((sum, j) => sum + (j.score ?? 0), 0) / previousScoreJobs.length)
        : null;

    const applicationDeltaPercent =
      applicationsPreviousMonth > 0
        ? Math.round(
            ((applicationsThisMonth - applicationsPreviousMonth) / applicationsPreviousMonth) * 100,
          )
        : null;
    const scoreDeltaPercent =
      currentAverageScore !== null && previousAverageScore !== null && previousAverageScore > 0
        ? Math.round(
            ((currentAverageScore - previousAverageScore) / previousAverageScore) * 100,
          )
        : null;

    const recentJobs = jobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((j) => ({
        ...j,
        url: j.url ?? undefined,
        location: j.location ?? undefined,
        employmentType: (j.employmentType as import('@repo/shared').EmploymentType) ?? undefined,
        salary: j.salary ?? undefined,
        score: j.score ?? undefined,
        atsScore: j.atsScore ?? undefined,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      }));

    const upcomingInterviews = jobs
      .filter((j) =>
        ['RECRUITER_SCREEN', 'TECHNICAL_INTERVIEW', 'FINAL_INTERVIEW'].includes(j.status),
      )
      .slice(0, 5)
      .map((j) => ({
        ...j,
        url: j.url ?? undefined,
        location: j.location ?? undefined,
        employmentType: (j.employmentType as import('@repo/shared').EmploymentType) ?? undefined,
        salary: j.salary ?? undefined,
        score: j.score ?? undefined,
        atsScore: j.atsScore ?? undefined,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      }));

    return reply.send({
      success: true,
      data: {
        totalJobs,
        savedJobs,
        applied,
        recruiterScreens,
        technicalInterviews,
        finalInterviews,
        offers,
        rejected,
        averageScore,
        applicationsThisMonth,
        interviewConversionRate,
        offerConversionRate,
        jobsByStatus,
        scoreDistribution,
        applicationsOverTime,
        recentJobs,
        upcomingInterviews,
        applicationTrends: {
          current: applicationsThisMonth,
          previous: applicationsPreviousMonth,
          deltaPercent: applicationDeltaPercent,
        },
        scoreTrend: {
          current: currentAverageScore,
          previous: previousAverageScore,
          deltaPercent: scoreDeltaPercent,
        },
      },
    });
  });
}
