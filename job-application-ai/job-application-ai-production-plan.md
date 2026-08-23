# Job Application AI Copilot — Production Implementation Plan

## 1. Project Context

- **Repository state**: Empty workspace (only `.commandcode/` exists).
- **Requirements source**: `c:\Users\Sriman\OneDrive\Documents\Study\AI_Experiments\job-application-ai\.commandcode\taste\prompt.md` (1,993 lines).
- **Goal**: Build a complete, production-grade, enterprise-ready SaaS application, not a prototype.

## 2. Architecture

### 2.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18+, Vite, TypeScript (strict), Tailwind CSS, React Router, TanStack Query, Lucide React, Recharts, dnd-kit, Zod |
| Backend | Node.js, TypeScript (strict), Fastify, Prisma ORM, Zod, Winston/Pino |
| Database | PostgreSQL 15+ |
| AI | DeepSeek V4 Flash via direct REST API integration |
| PDF | Playwright + HTML template or `pdf-lib`/`puppeteer` for deterministic ATS-safe PDFs |
| Storage | StorageService abstraction; local filesystem in dev, S3-compatible in production |
| Testing | Vitest, MSW, Playwright E2E, Supertest |
| DevOps | Docker, Docker Compose, GitHub Actions (CI/CD), ESLint, Prettier, Husky |

### 2.2 Monorepo Structure

```
job-application-ai/
├── apps/
│   ├── web/                  # Vite React frontend
│   └── api/                  # Fastify backend
├── packages/
│   └── shared/               # Shared TypeScript types, schemas, utilities
├── prisma/
│   └── schema.prisma         # Single source of truth DB schema
├── storage/
│   ├── uploads/              # JD uploads (dev)
│   └── resumes/              # Generated PDFs (dev)
├── tests/
│   ├── e2e/                  # Playwright tests
│   ├── integration/          # API integration tests
│   └── unit/                 # Shared unit tests
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── docker-compose.yml
├── .env.example
├── turbo.json                # Optional: monorepo task orchestration
├── package.json              # Root workspace config
└── README.md
```

## 3. Database Schema (Prisma)

### Models

- `User`
- `MasterResume`
- `ResumeVersion`
- `Job`
- `JobAnalysis` (JSONB for flexible analysis)
- `SkillMatch`
- `ApplicationTimeline`
- `Note`

### Key Design Decisions

- Use `jsonb` or JSON columns for `requiredSkills`, `preferredSkills`, `scoreBreakdown`, `changeSummary`, `optimization`.
- Normalize `SkillMatch` to support evidence-based lookups.
- Add indexes on `Job.status`, `Job.company`, `Job.priority`, `ResumeVersion.jobId`, `ApplicationTimeline.jobId`.
- Use soft-delete strategy for jobs and resumes (optional `deletedAt`).

## 4. Backend Plan (apps/api)

### 4.1 Directory Structure

```
apps/api/src/
├── config/                 # Environment validation via envalid/dotenv
├── controllers/            # Route handlers
├── routes/                 # Fastify route registration
├── services/
│   ├── ai/
│   │   ├── AIResumeService.ts
│   │   ├── DeepSeekResumeService.ts
│   │   ├── DeepSeekClient.ts
│   │   ├── prompts/
│   │   └── schemas/        # Zod schemas for AI outputs
│   ├── pdf/
│   │   ├── PDFService.ts
│   │   └── templates/
│   ├── storage/
│   │   ├── StorageService.ts
│   │   └── LocalStorageService.ts
│   └── jobs/
│       ├── JobService.ts
│       ├── ResumeService.ts
│       ├── AnalysisService.ts
│       └── TimelineService.ts
├── prisma/
│   └── client.ts
├── middleware/
│   ├── errorHandler.ts
│   ├── requestLogger.ts
│   ├── rateLimiter.ts
│   └── uploadValidator.ts
├── validators/             # Zod request validators
├── utils/
│   ├── logger.ts
│   ├── scoring.ts
│   └── fileHelpers.ts
└── app.ts
```

### 4.2 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/jobs | Create job |
| GET | /api/jobs | List jobs (with filters/search/sort) |
| GET | /api/jobs/:id | Get job details |
| PUT | /api/jobs/:id | Update job |
| DELETE | /api/jobs/:id | Delete job |
| PATCH | /api/jobs/:id/status | Update status (Kanban drag/drop) |
| POST | /api/jobs/:id/analyze | Analyze JD |
| POST | /api/jobs/:id/analyze-resume | Compare resume to JD |
| POST | /api/jobs/:id/generate-resume | Generate optimized resume + PDF |
| GET | /api/jobs/:id/resume-versions | List resume versions |
| GET | /api/resume-versions/:id | Get resume version |
| POST | /api/resume-versions/:id/generate-pdf | Regenerate PDF |
| GET | /api/resume-versions/:id/pdf | Download PDF |
| POST | /api/resume-versions/:id/make-current | Set current version |
| POST | /api/jobs/:id/timeline | Add timeline event |
| GET | /api/jobs/:id/timeline | Get timeline |
| POST | /api/resumes | Create/update master resume |
| GET | /api/resumes | List master resumes |
| GET | /api/resumes/:id | Get master resume |
| PUT | /api/resumes/:id | Update master resume |
| GET | /api/analytics/dashboard | Dashboard analytics |
| GET | /api/settings | Get settings |
| PUT | /api/settings | Update settings |

### 4.3 AI Orchestration (AIResumeService)

Interface:

- `analyzeJob(jobDescription: string): Promise<JDAnalysis>`
- `analyzeResume(resume: MasterResume): Promise<ResumeAnalysis>`
- `matchResumeToJob(jd: JDAnalysis, resume: ResumeAnalysis): Promise<MatchAnalysis>`
- `optimizeResume(job: Job, master: MasterResume, current: ResumeVersion, match: MatchAnalysis): Promise<OptimizedResume>`
- `validateResume(resume: ResumeContent, master: MasterResume): Promise<IntegrityResult>`
- `generateResume(job: Job, master: MasterResume, version: number): Promise<FinalResumeOutput>`

Workflow:

1. **JD Analysis** → DeepSeek extracts structured fields.
2. **Resume Analysis** → DeepSeek parses master resume into structured fields.
3. **Requirement Matching** → Backend computes matched/partial/missing + evidence.
4. **Initial Score** → Deterministic calculation in TypeScript (no LLM arithmetic).
5. **Optimization Loop** → Up to 3 iterations if score < target (default 85).
6. **Re-score** → Backend recalculates after each iteration.
7. **Validation** → Check fabrication, ATS structure, dates, keyword stuffing.
8. **Final Output** → Persist structured output and generate PDF.

### 4.4 Scoring Algorithm

| Dimension | Weight |
|-----------|--------|
| Required Skills Match | 30 |
| Preferred Skills Match | 15 |
| Role Alignment | 10 |
| Experience Alignment | 15 |
| Domain/Responsibility Alignment | 10 |
| Keyword Coverage | 10 |
| ATS Readability | 10 |
| **Total** | **100** |

Implementation: deterministic TypeScript function using matched/partial/missing counts and evidence presence.

### 4.5 Security

- Helmet for secure headers.
- CORS configured for frontend origin only.
- Rate limiting per IP and per route.
- Zod validation on all inputs.
- File upload limits (max 10MB), MIME type validation, safe filename sanitization.
- No stack traces in production errors.
- DeepSeek API key only in backend environment.
- Input sanitization for storage paths.

### 4.6 Reliability

- DeepSeek client with timeout (60s), retry (exponential backoff, max 3), and circuit breaker.
- Structured error responses.
- Centralized error handler.
- Pino/Winston JSON logging.
- Graceful shutdown handling.

## 5. Frontend Plan (apps/web)

### 5.1 Directory Structure

```
apps/web/src/
├── components/
│   ├── ui/                 # Button, Input, Card, Modal, Badge, etc.
│   ├── layout/             # Sidebar, Header, PageShell
│   ├── dashboard/          # Stats cards, charts
│   ├── jobs/               # Kanban, JobCard, JobForm, JobFilters
│   ├── resume/             # MasterResumeEditor, ResumeVersionList
│   ├── analysis/           # JDAnalysisPanel, ResumeAnalysisPanel, ScoreBreakdown
│   └── common/             # EmptyState, LoadingState, ErrorBoundary
├── pages/
│   ├── Dashboard.tsx
│   ├── Jobs.tsx
│   ├── JobDetails.tsx
│   ├── Resume.tsx
│   ├── Analytics.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useJobs.ts
│   ├── useJob.ts
│   ├── useResume.ts
│   ├── useAnalytics.ts
│   └── useMutation.ts
├── services/
│   └── api.ts              # Axios/fetch wrappers
├── types/
│   └── index.ts            # Shared frontend types (from @repo/shared)
├── lib/
│   ├── utils.ts
│   └── constants.ts
├── routes/
│   └── AppRoutes.tsx
├── App.tsx
└── main.tsx
```

### 5.2 Key UI Features

- **Dashboard**: stats, recent jobs, upcoming interviews, Recharts charts.
- **Job Tracker**: dnd-kit Kanban with optimistic UI, rollback on failure.
- **Job Details**: tabs for Overview, JD Analysis, Resume Analysis, Resume Versions, Timeline, Notes.
- **Master Resume**: rich text/form editor with sections.
- **Add Job**: paste JD or upload PDF/DOCX.
- **Score Component**: reusable with thresholds and disclaimer.
- **Analytics**: conversion rates, score distribution, skill gaps.
- **Settings**: AI model, target score, PDF/storage preferences.

### 5.3 State Management

- TanStack Query for server state.
- React Router for routing.
- Local React state for forms and UI.
- Zod for form validation.

## 6. PDF Generation

- Use a deterministic HTML-to-PDF service (e.g., Playwright/puppeteer with Handlebars or React-pdf if bundling is simpler).
- ATS-safe requirements: single column, standard headings, selectable text, no graphics/icons, consistent spacing.
- Filename: `Company_JobTitle_Resume_v1.pdf` (sanitized).
- Store via StorageService abstraction.

## 7. Testing Strategy

### 7.1 Unit Tests (Vitest)

- Scoring algorithm
- File helpers / validators
- AI output schema validation
- Storage service

### 7.2 Integration Tests (Vitest + Supertest)

- CRUD jobs
- Status updates
- Resume create/update
- JD analysis endpoint (mock DeepSeek)
- Resume generation endpoint (mock DeepSeek + PDF)
- Analytics endpoint

### 7.3 E2E Tests (Playwright)

- Full user flow: create master resume → add job → analyze → generate resume → download PDF → move Kanban card → verify analytics.

### 7.4 Mocking

- Mock DeepSeekClient for integration tests.
- MSW for frontend tests.

## 8. DevOps & Deployment

### 8.1 Docker Compose (Local)

- PostgreSQL service
- Backend service
- Frontend service
- Volume mounts for local storage

### 8.2 CI/CD (GitHub Actions)

- Lint, typecheck, format check
- Run unit + integration tests
- Build frontend and backend
- E2E tests against Docker Compose stack
- Deploy to staging/production (placeholder for user's chosen platform)

### 8.3 Environment Variables (.env.example)

```
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:pass@localhost:5432/jobappai
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
TARGET_RESUME_SCORE=85
STORAGE_PATH=./storage
MAX_UPLOAD_SIZE=10485760
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

## 9. Implementation Phases

### Phase 1 — Repository Setup

- Initialize monorepo with root `package.json`, workspaces.
- Add ESLint, Prettier, TypeScript strict configs, Husky pre-commit hooks.
- Create `.env.example`, `.gitignore`, `README.md`.

### Phase 2 — Database

- Write `prisma/schema.prisma`.
- Set up Docker Compose with PostgreSQL.
- Generate Prisma client and initial migration.

### Phase 3 — Backend Foundation

- Initialize Fastify app.
- Add middleware: CORS, Helmet, rate limiter, request logger, error handler.
- Add Prisma client module.
- Add health check route.

### Phase 4 — Core Services

- Implement `JobService`, `ResumeService`, `TimelineService`, `AnalysisService`.
- Add `StorageService` interface + `LocalStorageService`.
- Implement request validators with Zod.

### Phase 5 — AI Integration

- Implement `DeepSeekClient` with auth, retry, timeout, error handling.
- Implement `AIResumeService` interface and `DeepSeekResumeService`.
- Create Zod schemas for all AI outputs.
- Create prompt templates for JD analysis, resume analysis, matching, optimization, validation.

### Phase 6 — Scoring & Optimization

- Implement deterministic scoring algorithm.
- Implement optimization loop with max iterations.
- Add fabrication/integrity checks.

### Phase 7 — PDF Service

- Implement `PDFService` with deterministic ATS-safe template.
- Wire resume generation endpoint to create PDF.

### Phase 8 — API Routes

- Implement all REST endpoints listed above.
- Add file upload handling for JD PDF/DOCX.

### Phase 9 — Frontend Shell

- Initialize Vite React project.
- Set up Tailwind, React Router, TanStack Query, ESLint, Prettier.
- Create layout, navigation, theme.

### Phase 10 — Dashboard

- Build dashboard page with stats and charts.
- Wire to `/api/analytics/dashboard`.

### Phase 11 — Job Tracker

- Build Kanban board with dnd-kit.
- Implement search, filter, sort.
- Wire to jobs API.

### Phase 12 — Job Details

- Build job detail page with tabs.
- Implement timeline and notes.

### Phase 13 — Master Resume

- Build master resume editor.
- Support upload/paste/edit.

### Phase 14 — Analysis & Scoring UI

- Build JD analysis panel.
- Build resume analysis panel.
- Build score breakdown component.

### Phase 15 — Resume Optimization & Versioning

- Build optimization UI with before/after.
- Build resume version list with view/download/compare/make-current/regenerate.

### Phase 16 — Analytics

- Build analytics page.

### Phase 17 — Settings

- Build settings page.

### Phase 18 — Testing

- Write unit tests for scoring and validators.
- Write integration tests for all API routes.
- Write Playwright E2E tests for full flow.

### Phase 19 — Production Hardening

- Add structured logging, metrics, health checks.
- Add input sanitization, rate limiting, security headers.
- Add Docker production build.
- Add CI/CD workflows.

### Phase 20 — Run, Test, Fix

- Start full stack locally.
- Run through Definition of Done flow.
- Fix all errors.
- Production build verification.

## 10. Definition of Done (from prompt)

The application is complete when this flow works end-to-end:

1. Start PostgreSQL.
2. Start backend.
3. Start frontend.
4. Open browser.
5. Create Master Resume.
6. Create Job.
7. Enter Company, Job Title, JD.
8. Click Analyze.
9. Backend calls DeepSeek V4 Flash.
10. JD analysis, resume analysis, matched/partial/missing skills, score appear.
11. Click Generate Resume.
12. AI tailors resume truthfully, validates, scores, optimizes if needed.
13. Final resume and PDF generated.
14. Resume version stored.
15. Job appears in Kanban.
16. Drag job to Applied → status persists.
17. Timeline records change.
18. Dashboard and analytics update.

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| DeepSeek API unavailable/timeouts | Retry, circuit breaker, graceful error UI |
| LLM fabricates resume content | Strict validation against master resume, integrity checks |
| Malformed AI JSON | Zod schemas + controlled repair + error fallback |
| Large file uploads | Size limits, MIME validation, streaming |
| PDF generation failures | Fallback HTML preview, deterministic template |
| Database migration conflicts | Prisma migrations, seed scripts, version control |

## 12. Verification Checklist

- [ ] `npm install` succeeds.
- [ ] Lint passes.
- [ ] TypeScript strict passes.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] E2E tests pass.
- [ ] Frontend production build succeeds.
- [ ] Backend production build succeeds.
- [ ] Docker Compose stack starts.
- [ ] Full user flow from Definition of Done works.

## 13. Critical Files to Create/Modify

- `package.json` (root + apps)
- `prisma/schema.prisma`
- `docker-compose.yml`
- `.env.example`
- `apps/api/src/app.ts`
- `apps/api/src/services/ai/DeepSeekResumeService.ts`
- `apps/api/src/services/ai/DeepSeekClient.ts`
- `apps/api/src/services/pdf/PDFService.ts`
- `apps/api/src/services/storage/StorageService.ts`
- `apps/api/src/utils/scoring.ts`
- `apps/api/src/routes/jobs.ts`
- `apps/api/src/routes/resumes.ts`
- `apps/api/src/routes/analytics.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/pages/Dashboard.tsx`
- `apps/web/src/pages/Jobs.tsx`
- `apps/web/src/pages/JobDetails.tsx`
- `apps/web/src/pages/Resume.tsx`
- `apps/web/src/components/jobs/KanbanBoard.tsx`
- `apps/web/src/components/analysis/ScoreBreakdown.tsx`
- `tests/e2e/full-flow.spec.ts`
- `README.md`
