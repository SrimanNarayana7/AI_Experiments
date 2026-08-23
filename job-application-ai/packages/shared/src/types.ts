import { z } from 'zod';
import {
  JobSchema,
  CreateJobSchema,
  UpdateJobSchema,
  UpdateJobStatusSchema,
  MasterResumeSchema,
  CreateMasterResumeSchema,
  ResumeVersionSchema,
  ResumeLibraryItemSchema,
  JobAnalysisSchema,
  SkillMatchSchema,
  TimelineEventSchema,
  CreateTimelineEventSchema,
  NoteSchema,
  CreateNoteSchema,
  JDAnalysisOutputSchema,
  ResumeAnalysisOutputSchema,
  MatchAnalysisOutputSchema,
  OptimizedResumeOutputSchema,
  IntegrityResultSchema,
  ScoreBreakdownSchema,
  DashboardAnalyticsSchema,
  SettingsSchema,
  JobStatusSchema,
  PrioritySchema,
  EmploymentTypeSchema,
} from './schemas';

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export type Job = z.infer<typeof JobSchema>;
export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;
export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusSchema>;

export type MasterResume = z.infer<typeof MasterResumeSchema>;
export type CreateMasterResumeInput = z.infer<typeof CreateMasterResumeSchema>;

export type ResumeVersion = z.infer<typeof ResumeVersionSchema>;
export type ResumeLibraryItem = z.infer<typeof ResumeLibraryItemSchema>;

export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;
export type SkillMatch = z.infer<typeof SkillMatchSchema>;

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type CreateTimelineEventInput = z.infer<typeof CreateTimelineEventSchema>;

export type Note = z.infer<typeof NoteSchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export type JDAnalysisOutput = z.infer<typeof JDAnalysisOutputSchema>;
export type ResumeAnalysisOutput = z.infer<typeof ResumeAnalysisOutputSchema>;
export type MatchAnalysisOutput = z.infer<typeof MatchAnalysisOutputSchema>;
export type OptimizedResumeOutput = z.infer<typeof OptimizedResumeOutputSchema>;
export type IntegrityResult = z.infer<typeof IntegrityResultSchema>;
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;
export type DashboardAnalytics = z.infer<typeof DashboardAnalyticsSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
