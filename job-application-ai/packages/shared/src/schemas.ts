import { z } from 'zod';

export const JobStatusSchema = z.enum([
  'BACKLOG',
  'SAVED',
  'APPLIED',
  'RECRUITER_SCREEN',
  'TECHNICAL_INTERVIEW',
  'FINAL_INTERVIEW',
  'OFFER',
  'REJECTED',
]);

export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const EmploymentTypeSchema = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
]);

export const JobSchema = z.object({
  id: z.string().uuid(),
  company: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().nullable().optional(),
  location: z.string().nullable().optional(),
  employmentType: EmploymentTypeSchema.nullable().optional(),
  salary: z.string().nullable().optional(),
  priority: PrioritySchema.default('MEDIUM'),
  description: z.string().min(1),
  status: JobStatusSchema.default('BACKLOG'),
  score: z.number().min(0).max(100).nullable().optional(),
  atsScore: z.number().min(0).max(100).nullable().optional(),
  appliedAt: z.string().datetime().nullable().optional(),
  topSkills: z.array(z.string()).optional(),
  latestResumeVersion: z.number().int().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateJobSchema = JobSchema.omit({
  id: true,
  score: true,
  atsScore: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateJobSchema = CreateJobSchema.partial();

export const UpdateJobStatusSchema = z.object({
  status: JobStatusSchema,
});

export const MasterResumeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).default('Master Resume'),
  content: z.string().min(1),
  rawText: z.string().min(1),
  originalFilename: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().int().nullable().optional(),
  storagePath: z.string().nullable().optional(),
  extractedText: z.string().nullable().optional(),
  sourceType: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateMasterResumeSchema = MasterResumeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  isActive: true,
});

export const ResumeVersionSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  masterResumeId: z.string().uuid().nullable().optional(),
  versionNumber: z.number().int().positive(),
  content: z.record(z.unknown()),
  optimizedContent: z.record(z.unknown()).nullable().optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  atsScore: z.number().min(0).max(100).nullable().optional(),
  scoreBreakdown: z.record(z.number()).nullable().optional(),
  changeSummary: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  pdfPath: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ResumeLibraryItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['MASTER', 'COMPANY']),
  jobId: z.string().uuid().nullable().optional(),
  company: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  versionNumber: z.number().int().positive().nullable().optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  atsScore: z.number().min(0).max(100).nullable().optional(),
  filename: z.string().nullable().optional(),
  originalFilename: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().int().nullable().optional(),
  storagePath: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const JobAnalysisSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
  keywords: z.array(z.string()),
  roleSummary: z.string(),
  experienceLevel: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SkillMatchSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  skill: z.string(),
  category: z.enum(['REQUIRED', 'PREFERRED']),
  status: z.enum(['MATCHED', 'PARTIAL', 'MISSING']),
  evidence: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});

export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  type: z.enum([
    'CREATED',
    'STATUS_CHANGED',
    'ANALYZED',
    'RESUME_GENERATED',
    'NOTE_ADDED',
    'INTERVIEW_SCHEDULED',
    'OFFER_RECEIVED',
    'REJECTED',
  ]),
  title: z.string(),
  description: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().datetime(),
});

export const CreateTimelineEventSchema = TimelineEventSchema.omit({
  id: true,
  createdAt: true,
});

export const NoteSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateNoteSchema = NoteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const JDAnalysisOutputSchema = z.object({
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
  keywords: z.array(z.string()),
  roleSummary: z.string(),
  experienceLevel: z.string().optional(),
});

export const ResumeAnalysisOutputSchema = z.object({
  skills: z.array(z.string()),
  experiences: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      duration: z.string(),
      highlights: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string(),
    }),
  ),
  certifications: z.array(z.string()).optional(),
  summary: z.string(),
});

export const MatchAnalysisOutputSchema = z.object({
  matchedSkills: z.array(z.object({ skill: z.string(), evidence: z.string().optional() })),
  partialSkills: z.array(z.object({ skill: z.string(), evidence: z.string().optional() })),
  missingSkills: z.array(z.string()),
  experienceGaps: z.array(z.string()),
  keywordCoverage: z.number().min(0).max(1),
  roleAlignment: z.number().min(0).max(1),
  experienceAlignment: z.number().min(0).max(1),
});

export const OptimizedResumeOutputSchema = z.object({
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      duration: z.string(),
      highlights: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string(),
    }),
  ),
  certifications: z.array(z.string()).optional(),
  changes: z.array(z.string()),
});

export const IntegrityResultSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()),
  score: z.number().min(0).max(100),
});

export const ScoreBreakdownSchema = z.object({
  requiredSkills: z.number().min(0).max(100),
  preferredSkills: z.number().min(0).max(100),
  roleAlignment: z.number().min(0).max(100),
  experienceAlignment: z.number().min(0).max(100),
  domainAlignment: z.number().min(0).max(100),
  keywordCoverage: z.number().min(0).max(100),
  atsReadability: z.number().min(0).max(100),
  total: z.number().min(0).max(100),
});

export const DashboardAnalyticsSchema = z.object({
  totalJobs: z.number().int(),
  savedJobs: z.number().int(),
  applied: z.number().int(),
  recruiterScreens: z.number().int(),
  technicalInterviews: z.number().int(),
  finalInterviews: z.number().int(),
  offers: z.number().int(),
  rejected: z.number().int(),
  averageScore: z.number().nullable(),
  applicationsThisMonth: z.number().int(),
  interviewConversionRate: z.number().min(0).max(1),
  offerConversionRate: z.number().min(0).max(1),
  jobsByStatus: z.record(z.number().int()),
  scoreDistribution: z.array(z.object({ range: z.string(), count: z.number().int() })),
  applicationsOverTime: z.array(z.object({ date: z.string(), count: z.number().int() })),
  recentJobs: z.array(JobSchema),
  upcomingInterviews: z.array(JobSchema),
  applicationTrends: z.object({
    current: z.number().int(),
    previous: z.number().int(),
    deltaPercent: z.number().nullable(),
  }),
  scoreTrend: z.object({
    current: z.number().nullable(),
    previous: z.number().nullable(),
    deltaPercent: z.number().nullable(),
  }),
});

export const SettingsSchema = z.object({
  targetScore: z.number().min(0).max(100).default(85),
  deepseekModel: z.string().default('deepseek-v4-flash'),
  storageProvider: z.enum(['LOCAL', 'S3']).default('LOCAL'),
  defaultResumeTemplate: z.string().default('standard'),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).default('SYSTEM'),
});

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });
