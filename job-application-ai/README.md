# Job Application AI Copilot

AI-powered job application management platform for tracking jobs, analyzing job descriptions, generating tailored resumes, and managing a master resume library.

## What Changed

This version adds the production-focused enhancements from the implementation plan, including:

- Light, dark, and system theme support
- Theme persistence with no flash on load
- Master Resume upload for PDF and DOCX files
- Reliable resume extraction, storage, download, replace, preview, and delete flows
  - PDF text extraction is isolated from the storage buffer so PDF.js can never detach data needed later for saving (fixes the "detached ArrayBuffer" upload/replace failure)
  - Uploads are stored under collision-free `storage/resumes/master/` paths, so same-named replacements no longer overwrite or delete the newly uploaded file
  - Replacement commits the database record before cleaning up the old file, so a failure never loses the prior master
  - DOCX preview renders a real, generated PDF instead of serving DOCX bytes labeled as PDF
- Dedicated Resume Library for master and company resumes
- Resume version history and comparison UI
- Resume score visualization and score improvement display
- Improved job cards, dashboard, analytics, and timeline views
- Global search and command palette
- Toast notifications, confirmations, loading states, and empty states
- A cleaner responsive SaaS-style layout and design system
- A clickable top-right header with notifications and workspace controls
- Responsive mobile navigation with a drawer sidebar
- Visual alignment refinements across dashboard, jobs, and resume pages
- A Playwright end-to-end suite covering the full Master Resume upload / replace / refresh / preview / download flow for both PDF and DOCX

## Architecture

- Frontend: React 18 + Vite + TypeScript + TanStack Query + React Router
- Backend: Node.js + Fastify + TypeScript + Prisma
- Database: PostgreSQL
- AI: DeepSeek API integration
- PDF: Deterministic PDF generation using `pdf-lib`
- Storage: Local storage service with a clean abstraction for future object storage

## Quick Start

For first-time users:

1. Install dependencies.

```bash
npm install
```

2. Start PostgreSQL.

3. Create a root `.env` file if needed and fill in your values.

4. Apply database migrations.

```bash
npm run db:migrate
```

5. Seed the database if you want starter data.

```bash
npm run db:seed
```

6. Start the application.

```bash
npm run dev
```

If PowerShell blocks npm scripts on Windows, run the same commands through Command Prompt:

```bash
cmd /c npm install
cmd /c npm run db:migrate
cmd /c npm run db:seed
cmd /c npm run dev
```

Quick run sequence after the first setup:

```bash
npm install
npm run db:migrate
npm run dev
```

If you want starter records, run `npm run db:seed` after the migration step.

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL running locally

## Setup

1. Create a root `.env` file if you do not already have one.

Use values similar to:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5176
DATABASE_URL=postgresql://user:password@localhost:5432/jobappai
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
TARGET_RESUME_SCORE=85
STORAGE_PATH=./storage
MAX_UPLOAD_SIZE=10485760
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

2. Apply the database migration:

```bash
npm run db:migrate
```

3. Seed the database if needed:

```bash
npm run db:seed
```

## Run the Application

Start the full app from the repository root:

```bash
npm run dev
```

This starts:

- API at `http://localhost:3001`
- Web app at `http://localhost:5176` or the next available Vite port if 5176 is already in use

If PowerShell blocks npm scripts on your machine, run the command from Command Prompt or use:

```bash
cmd /c npm run dev
```

## Docker Deployment

Run the entire stack (PostgreSQL, migrations + seed, API, and web) in containers without installing anything except Docker:

```bash
docker compose up --build -d
```

What this does:

- `postgres` — PostgreSQL 15 container with a healthcheck.
- `migrate` — one-shot service that runs `prisma migrate deploy` then seeds the database; exits `0` when done.
- `api` — Fastify API on `http://localhost:3001`; waits for Postgres to be healthy and the migration to complete.
- `web` — nginx-served React app on `http://localhost:5173`; nginx proxies `/api` to the API container.

Before the first run, make sure the root `.env` has `DEEPSEEK_API_KEY` (and any other overrides) — compose reads it for the API container.

Inspect status and logs:

```bash
docker compose ps
docker compose logs -f migrate   # confirm migrations + seed ran
docker compose logs -f api
```

Uploaded resume files are stored in the `./storage` directory on your host (bind-mounted into the API container), separate from the Postgres data volume.

Full teardown (removes containers and the database volume, so the next `up` re-migrates and re-seeds from scratch):

```bash
docker compose down -v
```

Other useful commands:

```bash
docker compose up --build -d   # start (or rebuild + start)
docker compose stop            # stop without removing anything
docker compose down            # remove containers, keep the DB volume
```

## Useful Scripts

```bash
npm run dev        # Start web + API
npm run build      # Build all workspaces
npm run test       # Run all tests
npm run typecheck  # TypeScript checks
npm run lint       # ESLint
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:seed
```

## Main Features

### Dashboard

- KPI cards for total jobs, applications, interviews, offers, and average match score
- Recent activity and recent documents
- Trend visualization where data exists

### Jobs

- Kanban-style job tracker
- Status changes with persistence
- Job detail pages with analysis, versions, notes, and timeline
- Global search across jobs, companies, skills, and resume versions

### Resume Library

- Upload a Master Resume in PDF or DOCX format
- Optional paste-text fallback
- View, download, replace, and delete the master resume
- Browse company-specific resume versions
- Search, filter, sort, and compare versions

### Resume Workflow

- Extract text from uploaded documents
- Use extracted text as the source for analysis
- Generate optimized company-specific resumes
- Show before/after score improvements
- Preview and download generated PDFs

### UI/UX

- Light, dark, and system themes
- Collapsible sidebar
- Responsive mobile drawer navigation
- Quick actions
- Clickable notifications and workspace controls in the top-right header
- Toast notifications
- Confirmation dialogs for destructive actions
- Polished loading, empty, and error states
- Responsive layout for desktop, tablet, and mobile

## Key API Areas

- `POST /api/resumes/upload`
- `GET /api/resumes`
- `GET /api/resumes/:id`
- `GET /api/resumes/:id/download`
- `DELETE /api/resumes/:id`
- `POST /api/resumes/:id/replace`
- `GET /api/jobs/:id/resume-versions`
- `GET /api/resume-versions/:id`
- `GET /api/resume-versions/:id/download`
- `GET /api/resume-versions/:id/preview`

## Testing

### Unit / API tests

Run across all workspaces:

```bash
npm test
```

Run type checks:

```bash
npm run typecheck
```

Build production artifacts:

```bash
npm run build
```

### End-to-end tests

A Playwright suite in `tests/e2e/` exercises the full application against the running Docker stack (web on `http://localhost:5173`). Before running it, start the stack:

```bash
docker compose up --build -d
```

Then run the whole suite:

```bash
npx playwright test --reporter=list
```

Run just the Resume Library / Master Resume upload and replace flows:

```bash
npx playwright test tests/e2e/resume.spec.ts --reporter=list
```

The resume suite covers, for both **PDF and DOCX**:

- first upload through the real file input,
- replacement (PDF → DOCX and DOCX → PDF),
- persistence after a page reload,
- preview returning an actual PDF (`%PDF` bytes) and file download returning the original document bytes,
- cleanup and restoration of the original active master resume.

Test fixtures live in `tests/e2e/fixtures/` (`resume.pdf` and `resume.docx`). Note: the suite shares the configured database and storage, so it creates only throwaway master resumes and restores the original active master afterward.

## Notes

- The app expects PostgreSQL to be available before you start the API.
- Resume upload supports PDF and DOCX only.
- The API reads environment variables from the repository root `.env`.
- Do not commit secrets such as `DATABASE_URL` or `DEEPSEEK_API_KEY`.
