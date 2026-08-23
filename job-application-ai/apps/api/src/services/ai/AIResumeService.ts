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

export interface AIResumeService {
  analyzeJob(jobDescription: string): Promise<JDAnalysisOutput>;
  analyzeResume(master: MasterResume): Promise<ResumeAnalysisOutput>;
  matchResumeToJob(jd: JDAnalysisOutput, resume: ResumeAnalysisOutput): Promise<MatchAnalysisOutput>;
  optimizeResume(
    job: Job,
    master: MasterResume,
    current: ResumeVersion,
    match: MatchAnalysisOutput,
  ): Promise<OptimizedResumeOutput>;
  validateResume(resume: OptimizedResumeOutput, master: MasterResume): Promise<IntegrityResult>;
  generateResume(
    job: Job,
    master: MasterResume,
    version: number,
  ): Promise<{
    optimized: OptimizedResumeOutput;
    scoreBreakdown: ScoreBreakdown;
    integrity: IntegrityResult;
  }>;
}
