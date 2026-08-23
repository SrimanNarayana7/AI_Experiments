You are continuing development of the existing Job Application AI Copilot
application.

DO NOT rebuild the application from scratch.

First inspect the existing implementation and understand:

- current frontend architecture
- current backend architecture
- database schema
- existing routes
- existing components
- existing job tracker
- existing resume functionality
- existing AI workflow
- existing PDF generation
- existing styling/design system

Then incrementally enhance the existing application.

The goal of this task is to make the product feel like a polished,
professional enterprise SaaS application while adding the requested
resume-management functionality.

============================================================
PRIMARY ENHANCEMENTS
============================================================

Implement ALL of the following.

============================================================
1. LIGHT / DARK / SYSTEM THEME
============================================================

Add a complete theme system.

Supported modes:

LIGHT
DARK
SYSTEM

Add theme selector in Settings.

Also provide a quick theme toggle in the top navigation.

Requirements:

- persist user's preference
- default to SYSTEM
- automatically follow OS preference when SYSTEM is selected
- no flash of incorrect theme during page load
- all components must support both themes
- charts must remain readable
- dialogs/modals must support both themes
- Kanban board must support both themes
- PDF preview UI must support both themes

Do NOT simply invert colors.

Create a proper semantic color system.

Example tokens:

background
foreground
card
card-foreground
muted
muted-foreground
border
primary
primary-foreground
secondary
secondary-foreground
success
warning
destructive
info

Ensure sufficient contrast.

============================================================
2. MASTER RESUME UPLOAD
============================================================

Currently the Resume section may allow resume content to be entered manually.

Enhance it so the user can UPLOAD their existing Master Resume.

Supported:

PDF
DOCX

Primary UI:

------------------------------------------------
MASTER RESUME
------------------------------------------------

Upload your existing resume

[ Drag & Drop Resume ]

or

[ Browse Files ]

Supported:
PDF, DOCX
Maximum size: configurable

------------------------------------------------

Also provide:

[ Paste Resume Text ]

as an OPTIONAL fallback.

Uploading should be the primary experience.

============================================================
3. RESUME UPLOAD EXPERIENCE
============================================================

Create a polished upload component.

States:

Empty

Uploading

Processing

Extracting text

Analyzing

Success

Error

Example:

Uploading resume...

██████████████░░░░ 78%

Then:

✓ Resume uploaded

✓ Text extracted

✓ Resume ready

Do not make the user wait without feedback.

Display:

filename
file size
upload date
file type

Actions:

View
Download
Replace
Delete

============================================================
4. RESUME DOCUMENT PROCESSING
============================================================

Backend must support:

PDF text extraction.

DOCX text extraction.

The extracted text should become the source content for AI analysis.

Store:

original filename
file type
file size
storage path
extracted text
createdAt
updatedAt

Do NOT send binary files directly to the LLM.

Pipeline:

Uploaded Resume
       ↓
File Validation
       ↓
Text Extraction
       ↓
Resume Content
       ↓
Resume Analysis
       ↓
Master Resume

If extraction fails:

Show a clear error:

"Unable to extract readable text from this document."

Offer:

[Try Another File]

============================================================
5. MASTER RESUME LIBRARY
============================================================

Create a dedicated:

RESUME LIBRARY

section.

This should be different from the job tracker.

Example:

------------------------------------------------
Resume Library
------------------------------------------------

MASTER RESUME

┌──────────────────────────────────────────────┐
│ 📄 Master_Resume_2026.pdf                    │
│                                              │
│ Version 3                                   │
│ Updated Aug 23, 2026                        │
│                                              │
│ PDF • 245 KB                                │
│                                              │
│ [View] [Download] [Replace]                 │
└──────────────────────────────────────────────┘


COMPANY RESUMES

Amazon
Senior SDET

Resume v3
Score 91

[View] [Download]


Microsoft
SDET

Resume v2
Score 88

[View] [Download]

------------------------------------------------

Provide search and filtering.

============================================================
6. MASTER RESUME PDF
============================================================

The user should always be able to access the currently saved Master Resume.

Show:

filename
version
uploaded date
file size

Actions:

[View PDF]

[Download]

[Replace]

[Delete]

Do not force the user to upload again to retrieve it.

============================================================
7. COMPANY-WISE RESUME LIBRARY
============================================================

For every job, show the generated resumes.

Example:

AMAZON

Senior SDET

------------------------------------------------
Resume v1
Score: 78
Created: Aug 20

[View] [Download]


Resume v2
Score: 86
Created: Aug 21

[View] [Download]


Resume v3
Score: 91
Created: Aug 23

[View] [Download]
------------------------------------------------

Mark the current version:

CURRENT

Allow:

View
Download
Compare
Make Current
Delete

============================================================
8. RESUME PREVIEW
============================================================

Create an in-app PDF/document preview.

When user clicks:

[View]

open a professional preview screen or modal.

Layout:

LEFT:

PDF preview

RIGHT:

Resume information

Company
Role
Version
Score
ATS readiness
Created date
Changes

Actions:

[Download PDF]

[Compare Version]

[Make Current]

Do not require the user to download the PDF simply to inspect it.

============================================================
9. RESUME VERSION COMPARISON
============================================================

Add a professional version comparison UI.

Example:

Resume v2          Resume v3

Skills
Playwright          Playwright
Selenium            Selenium
REST Assured        REST Assured
                    AWS

Experience

Before:
"Worked on automation."

After:
"Developed automated test coverage using Selenium and Playwright."

Show:

Added
Removed
Changed

Use clear visual indicators.

Do not compare raw PDF binary files.

Compare the extracted structured resume content.

============================================================
10. RESUME VERSION TIMELINE
============================================================

For every resume show:

Version created
JD analyzed
Optimization performed
PDF generated
Downloaded
Applied

Example:

Aug 23

● Resume v3 generated

● Score improved from 82 → 91

● PDF generated

● Resume downloaded

This creates a professional audit trail.

============================================================
11. IMPROVE JOB CARD DESIGN
============================================================

Redesign the Kanban job cards.

Cards should have:

Company

Role

Status

Resume Match Score

ATS Readiness

Priority

Location

Application Date

Top 3 matched skills

Latest resume version

Example:

┌──────────────────────────────────────┐
│ Amazon                         HIGH  │
│ Senior SDET                         │
│                                      │
│ Match       91       ATS       94    │
│                                      │
│ Java   Playwright   Selenium         │
│                                      │
│ Resume: v3                           │
│ Applied: Aug 23                      │
│                                      │
│ [Open Job]                           │
└──────────────────────────────────────┘

Keep the card compact.

Do not make cards unnecessarily large.

============================================================
12. SCORE VISUALIZATION
============================================================

Create a reusable professional score component.

Example:

             91
           ─────
           /100

Excellent Match

Then show a compact breakdown.

Use a circular progress indicator or radial visualization.

Provide hover/tooltips for each category.

Example:

Required Skills
26 / 30

Preferred Skills
13 / 15

Role Alignment
9 / 10

Do not use the score merely as decoration.

The score should communicate useful information.

============================================================
13. SCORE IMPROVEMENT VISUALIZATION
============================================================

When a resume is optimized:

Show:

Before

78

↓

After

91

Improvement

+13

Use this in:

- Resume generation page
- Resume version page
- Job details
- Timeline

============================================================
14. DASHBOARD REFINEMENT
============================================================

Improve the dashboard visually and functionally.

Top KPI cards:

Total Jobs
Applications
Interviews
Offers
Average Match Score

Each KPI should show:

value

small trend

comparison with previous period

Example:

Applications

42

↑ 18%

This month

Do not create fake analytics.

If insufficient historical data exists:

show:

"Not enough data"

instead of inventing percentages.

============================================================
15. QUICK ACTIONS
============================================================

Add a Quick Actions section.

Actions:

+ Add Job

Upload Master Resume

Generate Resume

View Resume Library

View Analytics

============================================================
16. GLOBAL SEARCH
============================================================

Add global search in the top navigation.

Search across:

Companies
Job titles
Resume versions
Skills
Job status

Example:

Search:

"Amazon"

Results:

Amazon — Senior SDET
Amazon Resume v3
Amazon Resume v2

Keyboard shortcut:

Ctrl/Cmd + K

Create a command/search dialog.

============================================================
17. TOAST NOTIFICATIONS
============================================================

Implement a consistent toast system.

Examples:

✓ Job created

✓ JD analysis completed

✓ Resume generated

✓ PDF generated

✓ Resume downloaded

✓ Job moved to Applied

✕ Resume upload failed

✕ AI analysis failed

Do not use browser alert().

============================================================
18. CONFIRMATION DIALOGS
============================================================

For destructive actions:

Delete Job

Delete Resume

Delete Resume Version

Replace Master Resume

Show confirmation.

Example:

Delete Master Resume?

This will remove the saved master resume from your library.

[Cancel]

[Delete Resume]

Use destructive styling.

============================================================
19. LOADING STATES
============================================================

Every asynchronous operation needs a professional loading state.

Examples:

Analyzing JD...

Analyzing Resume...

Matching Skills...

Optimizing Resume...

Validating Resume...

Generating PDF...

Do not simply show:

"Loading..."

Use meaningful progress messaging.

For long AI workflows:

Show steps.

Example:

✓ Job description analyzed

✓ Resume analyzed

✓ Skills matched

● Optimizing resume

○ Validating resume

○ Generating PDF

============================================================
20. ERROR STATES
============================================================

Create polished error states.

Example:

AI Analysis Failed

We couldn't analyze this job description right now.

[Try Again]

Technical details should be available behind:

[View Details]

Do not expose stack traces directly in the main UI.

============================================================
21. EMPTY STATES
============================================================

Every page should have a useful empty state.

Example:

No jobs yet.

Start tracking your applications.

[Add Your First Job]

Resume Library:

No company resumes yet.

Generate a resume for a job to see it here.

[View Jobs]

============================================================
22. RESPONSIVE DESIGN
============================================================

The application must work on:

Desktop
Laptop
Tablet

Mobile should be usable even if desktop is the primary target.

Kanban:

Desktop:
horizontal columns

Tablet:
horizontal scrolling

Mobile:
convert to stacked status sections or horizontally scrollable board.

============================================================
23. SIDEBAR REFINEMENT
============================================================

Create a professional collapsible sidebar.

Navigation:

Dashboard

Jobs

Resume Library

Analytics

Settings

Collapsed state:

icons only

Expanded state:

icons + labels

Remember sidebar preference.

============================================================
24. TOP NAVIGATION
============================================================

Top bar:

Global Search

Theme Toggle

Notifications

User Menu

Optional:

Command palette shortcut indicator:

⌘ K

or

Ctrl K

============================================================
25. JOB DETAILS REFINEMENT
============================================================

Improve Job Details page.

Header:

Company
Role
Status
Priority

Score cards:

Resume Match
ATS Readiness

Actions:

Analyze JD

Generate Resume

View Current Resume

Download PDF

Move Status

Tabs:

Overview

JD Analysis

Resume Match

Resume Versions

Timeline

Notes

============================================================
26. RESUME GENERATION EXPERIENCE
============================================================

Create a polished AI generation workflow.

When user clicks:

Generate Resume

show a progress screen:

Analyzing job requirements
✓

Matching resume evidence
✓

Optimizing resume
●

Validating factual accuracy
○

Generating PDF
○

Complete
○

At completion:

Resume v3 generated

82 → 91

[View Resume]

[Download PDF]

[Done]

============================================================
27. RESUME LIBRARY FILTERS
============================================================

Allow:

Search by company

Search by role

Filter by score

Filter by date

Filter by version

Filter by status

Sort:

Newest

Oldest

Highest Score

Lowest Score

============================================================
28. FILE MANAGEMENT
============================================================

Create a clean file-management abstraction.

StorageService

Methods:

upload()

download()

delete()

exists()

getMetadata()

Do not couple the application directly to filesystem operations.

This allows future S3 migration.

============================================================
29. FILE VALIDATION
============================================================

For resume uploads:

Allowed:

.pdf
.docx

Validate:

extension

MIME type

file size

actual file structure where practical

Reject unsupported files.

Example:

"This file type isn't supported.

Please upload a PDF or DOCX resume."

============================================================
30. ACCESSIBILITY
============================================================

Improve accessibility.

Requirements:

Keyboard navigation

Visible focus states

ARIA labels where needed

Accessible dialogs

Accessible dropdowns

Accessible drag/drop

Color should not be the only indicator.

Ensure score/status indicators also include text.

============================================================
31. MICRO INTERACTIONS
============================================================

Add subtle professional interactions.

Examples:

Card hover

Button feedback

Score animation when loaded

Smooth Kanban movement

Upload progress

Success checkmark

Do NOT over-animate the UI.

Animation should improve usability.

============================================================
32. DESIGN SYSTEM
============================================================

Create reusable components:

Button

Card

Badge

Dialog

Dropdown

Tooltip

Tabs

Input

Textarea

Select

FileUpload

ScoreCard

ScoreBreakdown

JobCard

KanbanColumn

Timeline

EmptyState

LoadingState

ErrorState

ResumePreview

ResumeVersionCard

StatCard

Do not create duplicate one-off implementations.

============================================================
33. COLOR SYSTEM
============================================================

Use semantic colors.

Primary:

professional blue/indigo tone.

Success:

green.

Warning:

amber.

Danger:

red.

Neutral:

slate/gray.

Do not hardcode colors repeatedly.

Use design tokens.

Support both light and dark themes.

============================================================
34. TYPOGRAPHY
============================================================

Use a professional SaaS typography hierarchy.

Example:

Page title

Section title

Card title

Body

Secondary text

Caption

Avoid excessive font sizes.

============================================================
35. UI CONSISTENCY
============================================================

Every page must use the same:

spacing

radius

shadows

buttons

typography

colors

badges

dialogs

loading states

toast system

Do not allow individual pages to develop separate visual styles.

============================================================
36. RESUME STORAGE UX
============================================================

The Resume Library should become the central place for all documents.

Sections:

MASTER RESUME

Company Resumes

Recent Documents

------------------------------------------------

Master Resume

Master_Resume_2026.pdf

Version 3

Updated Aug 23

[View] [Download] [Replace]

------------------------------------------------

Company Resumes

Amazon
Senior SDET

v3
91

[View] [Download]

Microsoft
SDET

v2
88

[View] [Download]

------------------------------------------------

Recent Documents

Amazon_SDET_v3.pdf
Microsoft_SDET_v2.pdf

============================================================
37. DOWNLOAD BEHAVIOR
============================================================

When downloading:

Use the correct filename.

Example:

Amazon_Senior_SDET_Resume_v3.pdf

Master resume:

Master_Resume_v3.pdf

Do not generate generic:

download.pdf

============================================================
38. PDF PREVIEW UX
============================================================

PDF preview should have:

toolbar

zoom

page navigation if library supports it

download

close

The preview should feel like a document viewer.

Do not navigate the user away from the application unnecessarily.

============================================================
39. RECENT DOCUMENTS
============================================================

Dashboard should optionally show:

Recent Documents

Example:

Amazon_SDET_v3.pdf
Generated 10 minutes ago

Microsoft_SDET_v2.pdf
Generated yesterday

Master_Resume_v3.pdf
Updated 2 days ago

Actions:

View

Download

============================================================
40. SETTINGS REFINEMENT
============================================================

Settings should have sections:

Appearance

AI

Resume

PDF

Storage

Application

Appearance:

Theme

Light
Dark
System

AI:

Model

Target Score

Maximum Optimization Iterations

Resume:

Default Master Resume

PDF:

Font

Margins

Layout

Storage:

Storage provider

Application:

Default job status

Default priority

============================================================
41. PERFORMANCE
============================================================

Do not unnecessarily refetch data.

Use TanStack Query caching.

Optimistic updates where appropriate.

Lazy load large pages.

Lazy load PDF preview.

Avoid loading huge documents into the browser unnecessarily.

============================================================
42. SECURITY
============================================================

Do not expose:

DeepSeek API key

filesystem paths

internal errors

database credentials

Backend secrets

Validate uploaded documents.

Sanitize filenames.

============================================================
43. DATABASE CHANGES
============================================================

Update Prisma schema as required.

Support:

ResumeDocument

ResumeVersion

Job

JobAnalysis

ApplicationTimeline

DocumentMetadata

Store document information.

Example:

ResumeDocument:

id

type

MASTER | COMPANY

filename

originalFilename

mimeType

size

storagePath

extractedText

createdAt

updatedAt

Company resumes should link to:

Job

ResumeVersion

MasterResume

============================================================
44. API CHANGES
============================================================

Implement or extend APIs:

POST /api/resumes/upload

GET /api/resumes

GET /api/resumes/:id

GET /api/resumes/:id/download

DELETE /api/resumes/:id

POST /api/resumes/:id/replace

GET /api/jobs/:id/resume-versions

GET /api/resume-versions/:id

GET /api/resume-versions/:id/download

GET /api/resume-versions/:id/preview

============================================================
45. AUDIT TRAIL
============================================================

Record useful events:

Resume uploaded

Resume replaced

JD analyzed

Resume generated

Resume optimized

PDF generated

PDF downloaded

Job created

Job status changed

Interview added

Offer added

This should appear in the Job Timeline where relevant.

============================================================
46. PROFESSIONAL POLISH
============================================================

Before declaring completion, inspect every page visually.

Check:

alignment

spacing

responsive behavior

dark mode

light mode

empty states

loading states

error states

hover states

keyboard navigation

long company names

long job titles

long skill lists

long resume filenames

large score values

zero-data dashboards

many jobs

many resume versions

Ensure the UI remains usable.

============================================================
BLAST FRAMEWORK
============================================================

B = BUILD

Actually implement all enhancements.

L = LEARN / INSPECT

Inspect the current implementation first.

Do not duplicate existing functionality.

Reuse existing components where appropriate.

A = ARCHITECT

Keep clear separation:

UI

API

Database

AI

PDF

Storage

S = SHIP

Run:

lint

typecheck

tests

build

Run the application.

Fix errors.

T = TEST

Test:

Resume upload

PDF extraction

DOCX extraction

Resume download

Resume replacement

Resume deletion

Master Resume retrieval

Company Resume retrieval

PDF preview

PDF download

Theme persistence

Dark mode

Light mode

System mode

Kanban

Search

Filters

Score display

Resume generation

============================================================
DEFINITION OF DONE
============================================================

The following must work end-to-end.

1. User opens application.

2. User selects Light/Dark/System.

3. Theme persists after refresh.

4. User opens Resume Library.

5. User uploads Master Resume PDF.

6. Upload progress appears.

7. File is stored.

8. Text is extracted.

9. Resume becomes available as Master Resume.

10. User can View Master Resume.

11. User can Download Master Resume.

12. User creates a Job.

13. User enters JD.

14. AI analyzes JD.

15. AI compares JD against Master Resume.

16. Match score appears.

17. User generates tailored resume.

18. Resume version is stored.

19. Company-specific PDF is generated.

20. User can View the PDF.

21. User can Download it.

22. Company resume appears in Resume Library.

23. User can see all versions.

24. User can compare versions.

25. User can see score improvement.

26. User can move job through Kanban.

27. Dashboard reflects updated status.

28. Timeline records important actions.

29. Search works.

30. Filters work.

31. Loading states work.

32. Error states work.

33. Empty states work.

34. Responsive layout works.

35. Light/Dark/System works across every page.

============================================================
FINAL VISUAL QA
============================================================

Before finishing, review the application as if you were a real user.

Ask:

Does this look like a professional SaaS product?

Does the Resume Library feel like a real document management system?

Can I find my Master Resume immediately?

Can I find every company-specific resume?

Can I download any previous resume?

Can I understand why my score is 82?

Can I understand what changed between v2 and v3?

Can I track my applications easily?

Does dark mode look intentionally designed?

Does light mode look professional?

Are loading/error/empty states polished?

Are there any ugly default browser elements?

Are there inconsistent buttons?

Are there inconsistent spacing or colors?

Fix all issues you identify.

============================================================
IMPORTANT
============================================================

DO NOT remove existing working functionality.

DO NOT replace working backend APIs unnecessarily.

DO NOT create mock implementations for functionality that already exists.

DO NOT hardcode resume data.

DO NOT hardcode job data.

DO NOT hardcode analytics.

DO NOT fabricate ATS scores.

DO NOT fabricate resume content.

Preserve existing functionality while implementing these enhancements.

START BY INSPECTING THE CURRENT PROJECT.

Then implement the enhancements.

Run the application.

Test the application.

Fix all errors.

Only after verification, summarize what was changed.