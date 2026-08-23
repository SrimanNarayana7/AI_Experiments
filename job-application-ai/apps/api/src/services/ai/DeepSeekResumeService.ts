import type {
  JDAnalysisOutput,
  ResumeAnalysisOutput,
  MatchAnalysisOutput,
  OptimizedResumeOutput,
  IntegrityResult,
  Job,
  MasterResume,
  ResumeVersion,
  ScoreBreakdown,
} from '@repo/shared';
import { DeepSeekClient } from './DeepSeekClient';
import {
  JDAnalysisSchema,
  ResumeAnalysisSchema,
  MatchAnalysisSchema,
  OptimizedResumeSchema,
  IntegritySchema,
} from './schemas';
import {
  jdAnalysisPrompt,
  resumeAnalysisPrompt,
  matchAnalysisPrompt,
  optimizeResumePrompt,
  validateResumePrompt,
} from './prompts';
import type { AIResumeService } from './AIResumeService';
import { calculateScore, recalculateScore } from '../../utils/scoring';
import { env } from '../../config';
import { logger } from '../../logger';

export class DeepSeekResumeService implements AIResumeService {
  constructor(private client: DeepSeekClient) {}

  async analyzeJob(jobDescription: string): Promise<JDAnalysisOutput> {
    return this.client.complete(
      [
        {
          role: 'system',
          content:
            'You are an expert job description analyzer. Extract structured data accurately.',
        },
        { role: 'user', content: jdAnalysisPrompt(jobDescription) },
      ],
      JDAnalysisSchema,
    );
  }

  async analyzeResume(master: MasterResume): Promise<ResumeAnalysisOutput> {
    return this.client.complete(
      [
        {
          role: 'system',
          content:
            'You are an expert resume parser. Extract structured data without fabrication.',
        },
        { role: 'user', content: resumeAnalysisPrompt(master.rawText) },
      ],
      ResumeAnalysisSchema,
    );
  }

  async matchResumeToJob(
    jd: JDAnalysisOutput,
    resume: ResumeAnalysisOutput,
  ): Promise<MatchAnalysisOutput> {
    return this.client.complete(
      [
        {
          role: 'system',
          content:
            'You are an expert resume matcher. Compare job requirements against resume content.',
        },
        {
          role: 'user',
          content: matchAnalysisPrompt(JSON.stringify(jd), JSON.stringify(resume)),
        },
      ],
      MatchAnalysisSchema,
    );
  }

  async optimizeResume(
    job: Job,
    master: MasterResume,
    _current: ResumeVersion,
    match: MatchAnalysisOutput,
  ): Promise<OptimizedResumeOutput> {
    return this.client.complete(
      [
        {
          role: 'system',
          content:
            'You are an expert resume optimizer. Tailor resumes truthfully based on the master resume.',
        },
        {
          role: 'user',
          content: optimizeResumePrompt(
            job.description,
            master.rawText,
            JSON.stringify(match),
            1,
          ),
        },
      ],
      OptimizedResumeSchema,
    );
  }

  async validateResume(
    resume: OptimizedResumeOutput,
    master: MasterResume,
  ): Promise<IntegrityResult> {
    return this.client.complete(
      [
        {
          role: 'system',
          content:
            'You are a resume integrity validator. Detect fabrication and ATS issues.',
        },
        {
          role: 'user',
          content: validateResumePrompt(JSON.stringify(resume), master.rawText),
        },
      ],
      IntegritySchema,
    );
  }

  async generateResume(
    job: Job,
    master: MasterResume,
    version: number,
  ): Promise<{
    optimized: OptimizedResumeOutput;
    scoreBreakdown: ScoreBreakdown;
    integrity: IntegrityResult;
  }> {
    const jd = await this.analyzeJob(job.description);
    const resume = await this.analyzeResume(master);
    const match = await this.matchResumeToJob(jd, resume);

    const initialScore = calculateScore(jd, resume, match);
    logger.info({ initialScore: initialScore.total }, 'Initial resume score calculated');

    let bestOptimized: OptimizedResumeOutput | null = null;
    let bestScore = initialScore.total;
    let bestScoreBreakdown = initialScore;

    const maxIterations = 3;
    const targetScore = env.TARGET_RESUME_SCORE;

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const optimized = await this.optimizeResume(job, master, {} as ResumeVersion, match);
      const integrity = await this.validateResume(optimized, master);

      const scoreBreakdown = recalculateScore(jd, optimized, match, integrity);

      if (scoreBreakdown.total > bestScore) {
        bestOptimized = optimized;
        bestScore = scoreBreakdown.total;
        bestScoreBreakdown = scoreBreakdown;
      }

      logger.info(
        { iteration, score: scoreBreakdown.total, integrity: integrity.score },
        'Optimization iteration completed',
      );

      if (bestScore >= targetScore) {
        break;
      }
    }

    if (!bestOptimized) {
      bestOptimized = await this.optimizeResume(job, master, {} as ResumeVersion, match);
    }

    const finalIntegrity = await this.validateResume(bestOptimized, master);
    if (bestScore < initialScore.total) {
      bestScore = initialScore.total;
      bestScoreBreakdown = initialScore;
    }

    return {
      optimized: bestOptimized,
      scoreBreakdown: { ...bestScoreBreakdown, total: bestScore },
      integrity: finalIntegrity,
    };
  }
}
