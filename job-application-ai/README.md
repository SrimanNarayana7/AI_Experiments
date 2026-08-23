# Job Application AI Copilot

AI-powered job application management platform for tracking jobs, analyzing job descriptions, generating tailored resumes, and managing a master resume library.

## What Changed

This version adds the production-focused enhancements from the implementation plan, including:

- Light, dark, and system theme support
- Theme persistence with no flash on load
- Master Resume upload for PDF and DOCX files
- Resume extraction, storage, download, replace, preview, and delete flows
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

Run the full test suite:

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

## Notes

- The app expects PostgreSQL to be available before you start the API.
- Resume upload supports PDF and DOCX only.
- The API reads environment variables from the repository root `.env`.
- Do not commit secrets such as `DATABASE_URL` or `DEEPSEEK_API_KEY`.
