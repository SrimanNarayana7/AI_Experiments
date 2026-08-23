You are a senior Staff Full-Stack Engineer, AI Engineer, Product Designer,
Software Architect, QA Engineer, and DevOps Engineer.

Your job is to BUILD the complete application described below inside this
repository.

This is a real working product, not a prototype or UI mockup.

Do not only create a plan.
Do not stop after scaffolding.
Do not create fake AI responses.
Do not create static mock data for core functionality.

Inspect the repository first, then implement the application incrementally,
run it, test it, identify failures, and fix them.

============================================================
PROJECT
============================================================

NAME

Job Application AI Copilot

============================================================
PRODUCT VISION
============================================================

Build an AI-powered Job Application Management platform.

The user maintains one Master Resume.

For every job opportunity, the user provides:

- Company
- Job Title
- Job Description
- Optional Job URL
- Optional location/salary information

The system then:

1. Analyzes the Job Description.
2. Analyzes the Master Resume.
3. Compares the JD against the Resume.
4. Identifies matched skills.
5. Identifies partially matched skills.
6. Identifies missing skills.
7. Identifies experience gaps.
8. Identifies important keywords.
9. Creates a company-specific tailored resume.
10. Never fabricates candidate experience.
11. Calculates an internal Resume Match Score.
12. Optimizes the resume toward >=85 when possible.
13. Validates the optimized resume.
14. Generates a professional ATS-friendly PDF.
15. Stores the resume version.
16. Tracks the job application.
17. Provides a Jira-style Kanban job tracker.
18. Provides application analytics.

The product should feel like a professional enterprise SaaS product.

============================================================
IMPORTANT ARCHITECTURE DECISION
============================================================

DO NOT USE LANGFLOW.

There must be NO:

- Langflow
- Langflow API
- Langflow flow JSON
- LangflowService
- LANGFLOW_BASE_URL
- LANGFLOW_FLOW_ID
- LANGFLOW_API_KEY

The backend should communicate directly with the DeepSeek V4 Flash API.

Architecture:

React
   ↓
Node.js Backend
   ↓
AI Service
   ↓
DeepSeek V4 Flash

Backend
   ↓
PostgreSQL

Backend
   ↓
PDF Generator

React
   ↓
Backend REST API

The backend is responsible for orchestrating the AI workflow.

============================================================
RICE POT FRAMEWORK
============================================================

R = ROLE

Act as:

- Staff Full-Stack Engineer
- AI/LLM Engineer
- React Engineer
- TypeScript Engineer
- Backend Engineer
- Database Architect
- UX/Product Designer
- QA Engineer
- DevOps Engineer

You own the implementation end-to-end.

------------------------------------------------------------

I = INTENT

Build a complete application where:

MASTER RESUME
      +
JOB DESCRIPTION
      +
COMPANY
      +
JOB TITLE
      ↓
AI ANALYSIS
      ↓
SKILL MATCHING
      ↓
RESUME TAILORING
      ↓
SCORE
      ↓
OPTIMIZATION
      ↓
VALIDATION
      ↓
PDF
      ↓
JOB TRACKER

The final user experience should be:

"Give me a JD → give me my master resume → get a truthful,
company-specific optimized resume + score + PDF + tracked job."

------------------------------------------------------------

C = CONSTRAINTS

============================================================
TECH STACK
============================================================

FRONTEND

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- TanStack Query
- Lucide React
- Recharts
- dnd-kit for Kanban drag/drop
- Zod where frontend validation is useful

BACKEND

- Node.js
- TypeScript
- Fastify preferred
- REST API
- Zod validation
- Prisma ORM

DATABASE

- PostgreSQL

AI

- DeepSeek V4 Flash
- Direct API integration from backend
- Structured JSON responses
- Strong output validation

DOCUMENTS

- PDF generation must be deterministic
- LLM generates structured resume content
- Backend converts resume content into PDF
- Never ask the LLM to generate binary PDF data

STORAGE

Development:

local filesystem

Production-ready abstraction:

StorageService

so S3-compatible storage can be introduced later.

TESTING

- Vitest
- API integration tests
- React tests
- Playwright E2E tests

QUALITY

- TypeScript strict mode
- ESLint
- Prettier
- clean architecture
- strong typing
- centralized error handling
- structured logging
- environment configuration

------------------------------------------------------------

P = PRODUCT

============================================================
1. DASHBOARD
============================================================

Create a professional dashboard.

Display:

Total Jobs
Saved Jobs
Applied
Recruiter Screens
Technical Interviews
Final Interviews
Offers
Rejected

Average Resume Match Score

Applications this month

Interview conversion rate

Offer conversion rate

Charts:

- applications over time
- jobs by status
- score distribution

Recent Jobs.

Upcoming interviews.

Primary CTA:

[+ Add Job]

============================================================
2. JOB TRACKER
============================================================

Create a Jira-style Kanban board.

Columns:

BACKLOG

SAVED

APPLIED

RECRUITER SCREEN

TECHNICAL INTERVIEW

FINAL INTERVIEW

OFFER

REJECTED

Each job is a draggable card.

Example:

------------------------------------------------

AMAZON

Senior SDET

Resume Match
91 / 100

ATS Readiness
94 / 100

Java
Playwright
Selenium
REST Assured

Applied
Aug 23, 2026

Priority: HIGH

------------------------------------------------

Card actions:

Open
Edit
Generate Resume
Move
Delete

Drag and drop must persist status to PostgreSQL.

Add:

- search
- filter
- sort
- score filter
- company filter
- status filter
- priority filter

============================================================
3. ADD JOB
============================================================

Create Add Job page/modal.

Fields:

Company
Job Title
Job URL
Location
Employment Type
Salary
Priority
Job Description

Support:

- paste JD
- upload JD PDF
- upload JD DOCX

Buttons:

[Save Job]

[Analyze JD]

Validation:

Company required.

Job title required.

JD required.

============================================================
4. JD ANALYSIS
============================================================

Analyze the JD using DeepSeek.

Extract:

Required Skills
Preferred Skills
Responsibilities
Experience Requirements
Education Requirements
Keywords
Domain
Seniority

Display:

MATCHED
PARTIAL
MISSING

Do not fabricate information.

============================================================
5. MASTER RESUME
============================================================

Create a Master Resume section.

The user can:

- upload resume
- paste resume
- edit resume
- save resume
- create versions

Sections:

Contact
Professional Summary
Skills
Experience
Projects
Education
Certifications
Achievements

The Master Resume is the SOURCE OF TRUTH.

This is critical.

The AI must never create unsupported experience.

============================================================
6. RESUME ANALYSIS
============================================================

Compare:

JD

against

Master Resume

Display:

Matched Skills
Partial Matches
Missing Skills

For every important match, show evidence.

Example:

JD Requirement:

Playwright

Resume Evidence:

"Developed Playwright automation framework for web applications."

This evidence-based approach is mandatory.

============================================================
7. RESUME MATCH SCORE
============================================================

Create an internal scoring system.

DO NOT claim that this is an official score from any ATS vendor.

Label:

INTERNAL RESUME MATCH SCORE

Score:

0-100

Use:

Required Skills Match = 30
Preferred Skills Match = 15
Role Alignment = 10
Experience Alignment = 15
Domain/Responsibility Alignment = 10
Keyword Coverage = 10
ATS Readability = 10

Total = 100

Display the breakdown.

Example:

Required Skills
26 / 30

Preferred Skills
12 / 15

Role Alignment
9 / 10

Experience Alignment
13 / 15

Domain Alignment
8 / 10

Keyword Coverage
7 / 10

ATS Readability
10 / 10

TOTAL

85 / 100

============================================================
8. SCORE TARGET
============================================================

Target:

>=85

If score <85:

The AI may optimize the resume using information already present in the
Master Resume.

Allowed:

- reorder content
- rewrite bullets
- improve wording
- emphasize relevant experience
- use JD terminology when factually accurate
- improve section ordering
- remove irrelevant content
- improve keyword coverage using existing evidence

NOT allowed:

- invent skills
- invent projects
- invent certifications
- invent experience
- invent metrics
- invent companies
- invent dates
- invent technologies
- invent responsibilities

If truthful optimization cannot reach 85:

Return the highest defensible score.

Example:

72 / 100

Status:

BELOW_TARGET

Missing:

Kubernetes
AWS

Never fabricate just to reach 85.

============================================================
9. RESUME OPTIMIZATION
============================================================

Show:

Current Score

Target Score

Score Breakdown

Missing Skills

Recommendations

Changes Made

Before/After comparison.

Example:

BEFORE:

"Worked on automation testing."

AFTER:

"Developed and maintained automated UI test coverage using Selenium and
Playwright."

Only if the Master Resume contains evidence supporting this.

============================================================
10. RESUME GENERATION
============================================================

Generate a company-specific resume.

Example:

Master Resume

↓

Amazon

Senior SDET

↓

Amazon_Senior_SDET_v1.pdf

Another job:

Master Resume

↓

Microsoft

SDET

↓

Microsoft_SDET_v1.pdf

Each Job maintains its own resume versions.

============================================================
11. RESUME VERSIONING
============================================================

Every generated resume must have:

v1
v2
v3
...

Store:

Version
Job
Company
Role
Score
ATS Score
Resume Content
Change Summary
Created Date
PDF Path

Actions:

View

Download

Compare

Make Current

Regenerate

============================================================
12. JOB DETAILS
============================================================

Create detailed Job page.

Tabs:

Overview
JD Analysis
Resume Analysis
Resume Versions
Timeline
Notes

Header:

Company

Role

Status

Resume Match Score

ATS Readiness

Priority

Location

Salary

Timeline:

Job Added

JD Analyzed

Resume Generated

Applied

Recruiter Contact

Recruiter Screen

Technical Interview

Final Interview

Offer

Rejected

Allow manual timeline events.

============================================================
13. APPLICATION ANALYTICS
============================================================

Show:

Total Applications

Response Rate

Interview Rate

Offer Rate

Average Resume Score

Best Resume Version

Most Requested Skills

Most Common Missing Skills

Charts:

Applications over time

Applications by status

Score distribution

Interview conversion

Offer conversion

============================================================
14. SETTINGS
============================================================

Settings page:

AI Model

Target Resume Score

PDF Preferences

Storage Preferences

Application Preferences

Do not expose DeepSeek API keys in frontend.

============================================================
AI ARCHITECTURE
============================================================

The backend owns the AI orchestration.

Create:

AIResumeService

Interface:

analyzeJob()
analyzeResume()
matchResumeToJob()
optimizeResume()
validateResume()
generateResume()

Implementation:

DeepSeekResumeService

Architecture:

React
  ↓
Backend REST API
  ↓
AIResumeService
  ↓
DeepSeekResumeService
  ↓
DeepSeek V4 Flash

Do not put AI logic in React.

============================================================
AI WORKFLOW
============================================================

Implement the following orchestration in TypeScript.

------------------------------------------------------------
STEP 1 — JD ANALYSIS
------------------------------------------------------------

Input:

jobDescription

Output:

{
  jobTitle,
  seniority,
  requiredSkills,
  preferredSkills,
  responsibilities,
  experienceRequirements,
  educationRequirements,
  keywords,
  domain
}

------------------------------------------------------------
STEP 2 — RESUME ANALYSIS
------------------------------------------------------------

Input:

masterResume

Output:

{
  summary,
  skills,
  experience,
  projects,
  education,
  certifications,
  achievements
}

------------------------------------------------------------
STEP 3 — REQUIREMENT MATCHING
------------------------------------------------------------

Input:

JD Analysis

+

Resume Analysis

Output:

{
  matched,
  partial,
  missing,
  evidence,
  experienceGaps,
  keywordGaps
}

Every important matched requirement should have resume evidence.

------------------------------------------------------------
STEP 4 — INITIAL SCORE
------------------------------------------------------------

Calculate deterministic score.

Do NOT ask the LLM to perform arithmetic if it can be calculated in code.

The AI provides the classification.

The backend calculates the score.

------------------------------------------------------------
STEP 5 — RESUME OPTIMIZATION
------------------------------------------------------------

If score <85:

Send:

JD

Master Resume

Match Analysis

Current Resume

to DeepSeek.

Ask it to create a more targeted resume without introducing unsupported
information.

Maximum:

3 optimization iterations.

Do not run infinite loops.

------------------------------------------------------------
STEP 6 — SCORE AGAIN
------------------------------------------------------------

Backend recalculates score.

If:

score >=85

continue.

If:

score <85

and iterations remain:

optimize again.

If:

iterations exhausted

return BELOW_TARGET.

------------------------------------------------------------
STEP 7 — VALIDATION
------------------------------------------------------------

Validate:

Fabrication

Unsupported claims

Factual conflicts

ATS structure

Standard headings

Single column

No graphics

No keyword stuffing

Text readability

Dates consistency

------------------------------------------------------------
STEP 8 — FINAL STRUCTURED OUTPUT
------------------------------------------------------------

Use this schema:

{
  "company": "",
  "job_title": "",
  "status": "READY|BELOW_TARGET|BLOCKED",

  "resume_version": "",

  "resume_match_score": 0,

  "ats_readability_score": 0,

  "score_breakdown": {
    "required_skills": 0,
    "preferred_skills": 0,
    "role_alignment": 0,
    "experience_alignment": 0,
    "domain_alignment": 0,
    "keyword_coverage": 0,
    "ats_readability": 0
  },

  "jd_analysis": {
    "required_skills": [],
    "preferred_skills": [],
    "responsibilities": [],
    "experience_required": "",
    "education_required": [],
    "keywords": [],
    "domain": "",
    "seniority": ""
  },

  "resume_analysis": {
    "skills": [],
    "experience": [],
    "projects": [],
    "education": [],
    "certifications": [],
    "achievements": []
  },

  "skill_analysis": {
    "matched": [],
    "partial": [],
    "missing": []
  },

  "evidence": [],

  "optimization": {
    "changes": [],
    "keywords_emphasized": [],
    "sections_reordered": []
  },

  "integrity": {
    "fabrication_detected": false,
    "unsupported_claims": [],
    "factual_conflicts": []
  },

  "ats_checks": {
    "standard_headings": true,
    "single_column": true,
    "no_graphics": true,
    "no_keyword_stuffing": true,
    "text_readable": true
  },

  "resume_content": "",

  "pdf_filename": ""
}

============================================================
DEEPSEEK SERVICE
============================================================

Create a dedicated service.

Example:

src/services/ai/AIResumeService.ts

src/services/ai/DeepSeekResumeService.ts

Do not scatter DeepSeek API calls throughout the codebase.

Create:

DeepSeekClient

Responsibilities:

- API authentication
- model selection
- request creation
- timeout
- retry
- error handling
- response parsing

Configuration:

DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=
DEEPSEEK_MODEL=deepseek-v4-flash

Do not hardcode credentials.

============================================================
STRUCTURED AI OUTPUT
============================================================

Never blindly trust LLM output.

Validate every response with Zod.

For example:

JDAnalysisSchema

ResumeAnalysisSchema

MatchAnalysisSchema

ResumeOptimizationSchema

FinalResumeSchema

If parsing fails:

1. Attempt controlled repair.
2. Validate again.
3. If invalid, return controlled API error.

Never save invalid AI output to PostgreSQL.

============================================================
BACKEND API
============================================================

Jobs:

POST   /api/jobs

GET    /api/jobs

GET    /api/jobs/:id

PUT    /api/jobs/:id

DELETE /api/jobs/:id

PATCH  /api/jobs/:id/status


Resume:

POST /api/resumes

GET /api/resumes

GET /api/resumes/:id

PUT /api/resumes/:id


AI:

POST /api/jobs/:id/analyze

POST /api/jobs/:id/analyze-resume

POST /api/jobs/:id/generate-resume


Resume Versions:

GET /api/jobs/:id/resume-versions

GET /api/resume-versions/:id

POST /api/resume-versions/:id/generate-pdf

GET /api/resume-versions/:id/pdf


Timeline:

POST /api/jobs/:id/timeline

GET /api/jobs/:id/timeline


Analytics:

GET /api/analytics/dashboard

============================================================
DATABASE
============================================================

PostgreSQL + Prisma.

Models:

User

MasterResume

ResumeVersion

Job

JobAnalysis

SkillMatch

ApplicationTimeline

Note

------------------------------------------------------------

Job:

id
company
jobTitle
jobUrl
location
employmentType
salary
priority
status
jobDescription
createdAt
updatedAt
appliedAt

------------------------------------------------------------

MasterResume:

id
userId
name
content
version
createdAt
updatedAt

------------------------------------------------------------

ResumeVersion:

id
jobId
masterResumeId
version
resumeContent
matchScore
atsScore
scoreBreakdown
changeSummary
pdfPath
createdAt

------------------------------------------------------------

JobAnalysis:

id
jobId
requiredSkills
preferredSkills
responsibilities
experienceRequirements
educationRequirements
keywords
domain
seniority
createdAt

Use JSONB for complex analysis structures.

============================================================
PDF GENERATION
============================================================

Create a deterministic PDF generator.

Use a proper PDF library.

Requirements:

- ATS-safe
- single column
- selectable text
- standard headings
- professional typography
- no graphics
- no icons
- no decorative elements
- consistent spacing
- consistent dates
- clean margins

Filename:

Company_JobTitle_Resume_v1.pdf

Sanitize filenames.

============================================================
FRONTEND
============================================================

Use:

React
Vite
TypeScript
Tailwind
React Router
TanStack Query
Lucide
Recharts
dnd-kit

============================================================
UI DESIGN
============================================================

Design style:

Enterprise SaaS.

Reference design philosophy:

Linear + Jira + modern recruitment platform.

Avoid:

- excessive gradients
- unnecessary animations
- cartoon-like AI UI
- giant cards
- excessive whitespace
- fake AI effects

Use:

- strong hierarchy
- compact information density
- excellent spacing
- subtle borders
- professional typography
- responsive design
- accessible components
- useful empty states
- loading states
- error states

Main navigation:

Dashboard
Jobs
Resume
Analytics
Settings

============================================================
JOB BOARD
============================================================

Kanban columns:

BACKLOG
SAVED
APPLIED
RECRUITER SCREEN
TECHNICAL INTERVIEW
FINAL INTERVIEW
OFFER
REJECTED

Drag and drop.

Persist immediately.

Optimistic UI where appropriate.

Rollback on failure.

============================================================
JOB CARD
============================================================

Display:

Company

Job Title

Status

Resume Match Score

ATS Readiness

Priority

Location

Applied Date

Top matched skills

============================================================
SCORE COMPONENT
============================================================

Reusable component:

Internal Resume Match Score

0-100

Thresholds:

<60
Poor

60-74
Needs Improvement

75-84
Good

85-94
Excellent

95-100
Outstanding

Always explain:

"This is an internal resume-to-JD match score and not a guaranteed score
from a third-party ATS."

============================================================
R = RELIABILITY
============================================================

Handle:

DeepSeek unavailable

DeepSeek timeout

Malformed JSON

PDF generation failure

Database failure

Invalid PDF

Invalid DOCX

Invalid upload

Large upload

Missing JD

Missing Resume

Duplicate Job

Network failure

Implement:

- timeout
- retry
- structured errors
- logging
- validation
- graceful UI errors

Never expose secrets.

============================================================
SECURITY
============================================================

Use:

Helmet

CORS

Rate limiting

Zod validation

File validation

File size limits

Safe filenames

Environment variables

Do not expose stack traces.

Do not expose DeepSeek API key to frontend.

============================================================
BLAST IMPLEMENTATION FRAMEWORK
============================================================

B = BUILD

Actually build:

Frontend

Backend

Database

AI

PDF

Job Tracker

Analytics

Tests

Docker

Documentation

------------------------------------------------------------

L = LEARN / INSPECT

Before changing anything:

Inspect:

repository

package.json

existing source

existing configuration

existing environment files

existing assets

existing documentation

existing resume/job tracker files

Do not overwrite useful existing work.

------------------------------------------------------------

A = ARCHITECT

Establish clear boundaries:

Frontend

Backend

AI Service

Database

PDF Service

Storage Service

Use interfaces so components can be replaced later.

------------------------------------------------------------

S = SHIP

After implementation:

Run:

npm install

lint

typecheck

tests

build

Start backend.

Start frontend.

Test APIs.

Test browser.

Fix errors.

Do not tell me:

"It should work."

Verify it.

------------------------------------------------------------

T = TEST

Test:

Job creation

Job retrieval

Job update

Job deletion

Status movement

Resume creation

Resume editing

JD analysis

Resume analysis

Skill matching

Score calculation

Optimization

Fabrication prevention

Resume versioning

PDF generation

Kanban

Analytics

============================================================
PROJECT STRUCTURE
============================================================

Use:

job-application-ai/

├── apps/

│   ├── web/

│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   ├── lib/
│   │   │   └── routes/
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/
│       │   │   ├── ai/
│       │   │   ├── pdf/
│       │   │   ├── storage/
│       │   │   └── jobs/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── validators/
│       │   ├── schemas/
│       │   └── utils/
│       └── package.json
│
├── packages/
│   └── shared/
│
├── prisma/
│   └── schema.prisma
│
├── storage/
│   ├── uploads/
│   └── resumes/
│
├── tests/
│
├── docker-compose.yml
│
├── .env.example
│
├── package.json
│
└── README.md

============================================================
ENVIRONMENT
============================================================

Create:

.env.example

Include:

DATABASE_URL=

DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=
DEEPSEEK_MODEL=deepseek-v4-flash

PORT=
FRONTEND_URL=

STORAGE_PATH=

TARGET_RESUME_SCORE=85

Never commit real secrets.

============================================================
DOCKER
============================================================

Create docker-compose.yml.

At minimum:

PostgreSQL

Optionally:

Backend

Frontend

Make local development easy.

============================================================
VIBE CODING EXECUTION
============================================================

You are expected to work autonomously.

Follow this order:

PHASE 1

Inspect repository.

PHASE 2

Create architecture.

PHASE 3

Create database schema.

PHASE 4

Create backend foundation.

PHASE 5

Create DeepSeek integration.

PHASE 6

Create AI orchestration.

PHASE 7

Create PDF service.

PHASE 8

Create frontend shell.

PHASE 9

Create Dashboard.

PHASE 10

Create Job Tracker.

PHASE 11

Create Job Details.

PHASE 12

Create Master Resume.

PHASE 13

Create JD Analysis.

PHASE 14

Create Resume Analysis.

PHASE 15

Create Resume Optimization.

PHASE 16

Create Resume Versioning.

PHASE 17

Create Analytics.

PHASE 18

Create Settings.

PHASE 19

Create tests.

PHASE 20

Run everything.

PHASE 21

Fix all errors.

PHASE 22

Production build.

============================================================
DO NOT ASK FOR EVERY SMALL DECISION
============================================================

Make sensible engineering decisions.

Only ask me if:

- a required secret is unavailable
- an external dependency is absolutely required
- a destructive irreversible action is needed

Otherwise proceed.

============================================================
DEFINITION OF DONE
============================================================

The application is NOT complete until this flow works:

1. Start PostgreSQL.

2. Start backend.

3. Start frontend.

4. Open browser.

5. Create Master Resume.

6. Create Job.

7. Enter Company.

8. Enter Job Title.

9. Paste Job Description.

10. Click Analyze.

11. Backend calls DeepSeek V4 Flash.

12. JD analysis appears.

13. Resume analysis appears.

14. Matched skills appear.

15. Partial skills appear.

16. Missing skills appear.

17. Resume Match Score appears.

18. Click Generate Resume.

19. AI generates tailored resume.

20. Backend validates AI response.

21. Backend calculates score.

22. If score <85, optimization runs up to the configured maximum.

23. No unsupported information is introduced.

24. Final resume is displayed.

25. PDF is generated.

26. PDF can be opened.

27. Resume version is stored.

28. Job appears in Kanban.

29. Drag job to Applied.

30. Status persists after refresh.

31. Timeline records the status change.

32. Dashboard statistics update.

33. Analytics update.

This entire flow must work.

============================================================
FINAL REQUIREMENT
============================================================

Do not give me a long explanation before implementation.

START BY INSPECTING THE REPOSITORY.

Then BUILD the application.

After implementation, run the application and tests.

Fix the errors you find.

Only after the application is actually working, provide:

1. Architecture summary
2. Folder structure
3. Technologies
4. Run instructions
5. Environment variables
6. Database setup
7. DeepSeek setup
8. Test commands
9. Build commands
10. Known limitations
11. Future improvements

BUILD THE COMPLETE APPLICATION AND DOCUMENT IT PROFESSIONALY USING README.md