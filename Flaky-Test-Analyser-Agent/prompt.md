You are working inside my existing repository.

I need you to build a production-grade enterprise UI for an EXISTING Langflow AI agent called:

FlakyTest_AI_Agent

IMPORTANT:
Do NOT recreate the Langflow workflow.
Do NOT implement the AI/flakiness analysis logic in React.
Do NOT replace Langflow with local JavaScript logic.
The Langflow workflow already exists and must remain the source of truth for AI analysis.

The repository contains the exported Langflow workflow JSON:
FlakyTest_AI_Agent.json

Use this export file as the authoritative reference for understanding the existing workflow and its inputs/outputs.

==================================================
1. OBJECTIVE
==================================================

Build a React + Vite frontend that allows a QA/Test Engineer to:

1. Upload the Playwright result.json from Build 1.
2. Upload the Playwright result.json from Build 2.
3. Send both JSON files to the existing Langflow FlakyTest_AI_Agent API.
4. Wait for the Langflow analysis.
5. Display the AI-generated flakiness analysis in a professional enterprise dashboard.

The application is essentially a frontend/orchestration layer around the existing Langflow workflow.

User flow:

Upload Build 1 JSON
        +
Upload Build 2 JSON
        ↓
Validate files
        ↓
Analyze Flakiness
        ↓
Call Langflow API
        ↓
Receive Agent response
        ↓
Parse/normalize response
        ↓
Display enterprise test reliability dashboard


==================================================
2. TECHNOLOGY
==================================================

Use:

- React
- Vite
- TypeScript
- Modern React hooks
- React Router if routing is useful
- Tailwind CSS
- Lucide React icons
- No Next.js
- No backend unless absolutely required
- No mock AI logic in production flow

The UI must be responsive and enterprise-grade.

Use a clean architecture:

src/
  components/
  pages/
  layouts/
  services/
  hooks/
  types/
  utils/
  config/
  assets/

Keep API communication isolated from UI components.

Example:

src/services/langflowApi.ts

The Langflow API URL must come from environment configuration:

VITE_LANGFLOW_API_URL=

Do not hardcode localhost URLs.

Also support:

VITE_LANGFLOW_FLOW_ID=

VITE_LANGFLOW_API_KEY=

If the Langflow deployment does not require an API key, handle that gracefully.

Create:

.env.example

with the required configuration variables.


==================================================
3. EXISTING LANGFLOW WORKFLOW
==================================================

The uploaded export file is:

FlakyTest_AI_Agent.json

The flow name is:

FlakyTest_AI_Agent

The exported flow ID is:

6bf6a234-da40-4dd7-8afd-8750d705e8ce

The workflow contains:

Read File
Read File
Prompt Template
Agent
Chat Output

The two Read File nodes feed:

file1 → Build 1 JSON
file2 → Build 2 JSON

The Prompt Template receives:

{file1}
{file2}

The resulting prompt is sent to the Agent.

The Agent response is sent to Chat Output.

Do not alter this workflow.


==================================================
4. EXISTING LANGFLOW PROMPT / BUSINESS LOGIC
==================================================

The Langflow agent currently uses this logic:

"You are a senior test reliability engineer. You are given a comparison of two Playwright runs (Build 1 and Build 2) of the same suite.

COMPARISON REPORT:
{file1} - Build 1 JSON
{file2} - Build 2 JSON

Definitions you MUST follow:
- FLAKY = non-deterministic result: passed in one build and failed in the other, OR passed only after a retry. Flaky tests need a rerun / quarantine, not a code fix.
- CONSISTENT FAILURE = failed in BOTH builds. A real, reproducible bug, NOT flaky. Needs a fix.

Produce:
1. FLAKY_TESTS - names + one-line hypothesis of flake cause (timing, data, parallelism, network...).
2. CONSISTENT_FAILURES - tests failing in both builds, each with a probable root cause.
3. RERUN_RECOMMENDATION - which to rerun (flaky) vs send to engineering (bugs).
4. SUMMARY - counts + one sentence on suite health.

Base everything only on the comparison data. Do not invent test names."

This logic must remain in Langflow.

The React application should only present the result beautifully.


==================================================
5. MAIN PAGE
==================================================

Create a professional page titled:

Flaky Test Analyzer

Subtitle:

Compare two Playwright builds and identify flaky tests, consistent failures, and recommended actions.

Top navigation/header:

- Product name: Flaky Test Analyzer
- Small status indicator:
  "Langflow Connected"
- Optional settings icon
- Clean enterprise styling

Avoid excessive marketing UI.

This is an internal QA engineering tool.


==================================================
6. FILE UPLOAD SECTION
==================================================

Create a large "Build Comparison" section.

Display two upload cards side by side:

--------------------------------
BUILD 1
--------------------------------

Label:

Build 1

Description:

Upload the Playwright result.json from the baseline build.

Upload area:

Drag & drop result.json here

or

Browse Files

After upload display:

✓ result.json
68.7 KB

Include:

- filename
- file size
- JSON validation status
- remove button
- replace button

--------------------------------
BUILD 2
--------------------------------

Label:

Build 2

Description:

Upload the Playwright result.json from the comparison build.

Same upload behavior.

Only accept:

.json

Validate that the uploaded file contains valid JSON.

Do not assume a specific Playwright JSON schema unless needed by the UI.

Do not parse the test results to determine flakiness in React.

Langflow remains responsible for analysis.


==================================================
7. UPLOAD UX
==================================================

Implement:

- Drag and drop
- Click to upload
- File picker
- JSON validation
- File size display
- Upload progress if applicable
- Remove file
- Replace file
- Error states

Examples:

Invalid JSON:

"Invalid JSON file. Please upload a valid Playwright result.json."

Wrong extension:

"Unsupported file type. Please upload a .json file."

Missing file:

"Upload both Build 1 and Build 2 before starting analysis."


==================================================
8. PRIMARY ACTION
==================================================

Create one primary button:

Analyze Flakiness

Initially disabled.

Enable only when:

Build 1 is uploaded
AND
Build 2 is uploaded
AND
both files contain valid JSON.

When clicked:

- disable the button
- show loading state
- show progress/status information

Example:

Analyzing test reliability...

Step 1 of 3
Preparing build results

Step 2 of 3
Sending data to AI analyzer

Step 3 of 3
Generating reliability report

Do not fake progress percentages.

These should represent UI stages, not fake backend progress.


==================================================
9. LANGFLOW API INTEGRATION
==================================================

Create a dedicated API service.

Example:

src/services/langflowApi.ts

Implement:

analyzeFlakyTests(build1File, build2File)

The service should:

1. Read both files.
2. Convert their contents into the format expected by the existing Langflow flow.
3. Call the Langflow API.
4. Handle HTTP errors.
5. Handle timeout.
6. Handle malformed responses.
7. Return a normalized analysis result to the UI.

IMPORTANT:

Before writing the API request implementation, inspect the repository and the Langflow export carefully.

Determine the correct Langflow API invocation pattern based on the existing flow.

Do NOT invent an endpoint format blindly.

If the repository already contains an existing Langflow API call, reuse its conventions.

If there is no existing API integration, create it in a configurable service and document the expected endpoint/payload in the README.

The frontend must not contain API implementation logic inside React components.

Use:

services/langflowApi.ts


==================================================
10. PAYLOAD DESIGN
==================================================

The Langflow Prompt Template expects:

file1
file2

Therefore the API layer must ensure:

file1 = complete Build 1 result.json content

file2 = complete Build 2 result.json content

Do not send only filenames.

Do not truncate JSON.

Do not stringify JSON twice.

Preserve the original JSON content exactly when passing it to Langflow.

The frontend should not modify the Playwright result data unless required for transport.


==================================================
11. RESPONSE HANDLING
==================================================

The current Langflow agent produces a natural-language response with these logical sections:

FLAKY_TESTS
CONSISTENT_FAILURES
RERUN_RECOMMENDATION
SUMMARY

The frontend must be resilient because the LLM response may not always have perfect formatting.

Create a response normalization layer:

src/utils/analysisParser.ts

It should attempt to extract:

{
  flakyTests: [],
  consistentFailures: [],
  rerunRecommendation: {},
  summary: {}
}

If structured extraction is impossible, display the original AI response in a readable "AI Analysis" section instead of crashing.

Do NOT invent missing values.

Do NOT fabricate test names.

If parsing fails, show:

"AI analysis received, but structured rendering was unavailable."

Then display the raw response.


==================================================
12. RESULTS DASHBOARD
==================================================

After successful analysis, replace/expand the upload section with a dashboard.

Top summary cards:

--------------------------------
Flaky Tests
0
Tests requiring rerun
--------------------------------

--------------------------------
Consistent Failures
0
Tests failing in both builds
--------------------------------

--------------------------------
Build 1
X tests
--------------------------------

--------------------------------
Build 2
X tests
--------------------------------

If counts cannot safely be determined from the AI response, do not fabricate them.

Use only available data.


==================================================
13. SUITE HEALTH
==================================================

Create a prominent:

Suite Health

section.

Possible states:

Healthy
Attention Required
Unstable
Critical

However:

Do NOT create arbitrary health calculations that contradict the Langflow output.

If the AI summary provides suite health, use it.

If not, derive only from clearly available counts.

Use clear visual status indicators.


==================================================
14. FLAKY TESTS SECTION
==================================================

Create a section:

Flaky Tests

Subtitle:

Tests showing non-deterministic behavior across builds.

Display each test in a professional card/table.

Columns:

Test Name
Build 1
Build 2
Likely Cause
Recommended Action

Example:

Checkout › Apply coupon
PASS
FAIL
Timing / synchronization
Rerun

Payment › Create payment
FAIL
PASS
Network instability
Rerun

Do not invent Build 1 / Build 2 states if the AI response does not provide them.

If only the test name and hypothesis are available, show:

Test Name
Hypothesis
Action

Each flaky test should have a "FLAKY" badge.


==================================================
15. CONSISTENT FAILURES SECTION
==================================================

Create:

Consistent Failures

Subtitle:

Tests failing consistently across both builds. These are not considered flaky.

Display:

Test Name
Build 1
Build 2
Probable Root Cause
Recommended Action

Use a "CONSISTENT FAILURE" badge.

Make the distinction extremely clear:

FLAKY:
Non-deterministic → rerun/quarantine

CONSISTENT FAILURE:
Reproducible → engineering investigation


==================================================
16. RECOMMENDATIONS SECTION
==================================================

Create a section:

Recommended Actions

Split into two cards:

RERUN

Tests that should be rerun because they appear flaky.

Action:

Rerun / Quarantine

ENGINEERING INVESTIGATION

Tests failing consistently.

Action:

Send to Engineering

The UI should clearly communicate the difference between:

"Do not immediately fix the test"

and

"Investigate the application defect."


==================================================
17. AI ANALYSIS SECTION
==================================================

Add a collapsible section:

AI Analysis

This should display the raw Langflow response.

Useful for QA engineers who want to inspect exactly what the AI returned.

Use monospace formatting where appropriate.

Add:

Copy Analysis

button.

Do not modify the AI's original response.


==================================================
18. BUILD DETAILS
==================================================

Add an expandable section:

Build Details

Display:

Build 1
- filename
- file size
- upload timestamp
- validation status

Build 2
- filename
- file size
- upload timestamp
- validation status

Do not expose raw JSON by default.

Provide:

View JSON

inside a modal/drawer.

Use syntax highlighting if practical.

Do not make the raw JSON the primary UI.


==================================================
19. RESET / NEW ANALYSIS
==================================================

After analysis:

Show:

New Analysis

button.

Clicking it should clear:

- Build 1
- Build 2
- analysis result
- errors
- loading state

and return the UI to the initial upload state.


==================================================
20. ERROR HANDLING
==================================================

Handle:

- Langflow unavailable
- HTTP 400
- HTTP 401/403
- HTTP 404
- HTTP 500
- timeout
- malformed AI response
- invalid JSON
- empty response
- network failure

Examples:

Langflow unavailable:

"Unable to connect to the Flaky Test Analyzer service."

Timeout:

"The analysis took longer than expected. Please try again."

Malformed response:

"Analysis completed, but the response could not be rendered as structured results."

Never expose stack traces to the normal user.

Console logging can contain diagnostic information in development only.


==================================================
21. ENTERPRISE UX
==================================================

The UI should feel like an internal enterprise QA platform.

Design principles:

- Clean
- Minimal
- Professional
- Data-focused
- High information density
- Strong visual hierarchy
- Accessible
- Responsive
- Keyboard friendly

Avoid:

- flashy gradients
- excessive animations
- unnecessary illustrations
- marketing-style hero sections
- giant empty spaces
- excessive rounded cards
- excessive colors

Use subtle status colors:

Flaky → warning
Consistent failure → error
Healthy → success
Neutral → gray/blue

Use Lucide icons.


==================================================
22. RESPONSIVE DESIGN
==================================================

Desktop:

Two upload cards side-by-side.

Results dashboard with tables.

Tablet:

Two-column layout where possible.

Mobile:

Stack upload cards.

Stack summary cards.

Tables become horizontally scrollable or responsive cards.


==================================================
23. ACCESSIBILITY
==================================================

Implement:

- proper labels
- keyboard-accessible upload controls
- focus states
- ARIA labels where needed
- semantic buttons
- accessible status messages
- sufficient contrast

Loading state should be announced appropriately.


==================================================
24. STATE MANAGEMENT
==================================================

Do not introduce Redux unless necessary.

Use React state/hooks for this workflow.

Suggested state:

build1File
build2File
build1Validation
build2Validation
analysisStatus
analysisResult
error
showJsonModal
showRawAnalysis
isAnalyzing

Create a custom hook if useful:

useFlakyTestAnalysis()


==================================================
25. TYPESCRIPT TYPES
==================================================

Create explicit types.

Example:

type AnalysisStatus =
  | "idle"
  | "validating"
  | "uploading"
  | "analyzing"
  | "success"
  | "error";

interface UploadedBuild {
  file: File;
  valid: boolean;
  size: number;
}

interface FlakyTest {
  name: string;
  hypothesis?: string;
  build1Status?: string;
  build2Status?: string;
  action?: string;
}

interface ConsistentFailure {
  name: string;
  rootCause?: string;
  build1Status?: string;
  build2Status?: string;
  action?: string;
}

interface AnalysisResult {
  flakyTests: FlakyTest[];
  consistentFailures: ConsistentFailure[];
  rerunRecommendation?: string;
  summary?: string;
  rawResponse: string;
}

Adjust these types according to the actual Langflow response once inspected.


==================================================
26. PROJECT STRUCTURE
==================================================

Use a maintainable structure similar to:

src/
  components/
    layout/
      Header.tsx
    upload/
      BuildUploadCard.tsx
      BuildComparison.tsx
    analysis/
      AnalysisDashboard.tsx
      SummaryCards.tsx
      SuiteHealth.tsx
      FlakyTestsTable.tsx
      ConsistentFailuresTable.tsx
      Recommendations.tsx
      AIAnalysis.tsx
      BuildDetails.tsx
    common/
      Button.tsx
      StatusBadge.tsx
      LoadingState.tsx
      ErrorState.tsx
      EmptyState.tsx

  pages/
    FlakyTestAnalyzerPage.tsx

  services/
    langflowApi.ts

  hooks/
    useFlakyTestAnalysis.ts

  types/
    flakyTest.ts

  utils/
    analysisParser.ts
    fileValidation.ts

  config/
    env.ts

  App.tsx
  main.tsx
  index.css


==================================================
27. API CONFIGURATION
==================================================

Create:

.env.example

Example:

VITE_LANGFLOW_API_URL=http://localhost:7860
VITE_LANGFLOW_FLOW_ID=6bf6a234-da40-4dd7-8afd-8750d705e8ce
VITE_LANGFLOW_API_KEY=

Do not commit real credentials.

If the Langflow API requires authentication, read the key from environment variables.

Do not expose secrets in source code.


==================================================
28. IMPORTANT CORS CONSIDERATION
==================================================

The frontend will probably run on something like:

http://localhost:5173

Langflow may run on:

http://localhost:7860

Be aware of CORS.

Do not solve CORS by adding insecure browser hacks.

If required for local development, configure a Vite development proxy.

Example concept:

/langflow/* → http://localhost:7860/*

Keep this configurable.

Production deployment should support a proper backend/proxy or correctly configured Langflow CORS.


==================================================
29. NO MOCK DATA
==================================================

Do not build the UI around hardcoded fake analysis results.

You may create a development-only sample fixture for UI testing, but:

- production flow must use Langflow
- sample data must be clearly separated
- never silently fall back to fake AI results


==================================================
30. TESTING
==================================================

Add basic tests for:

- valid JSON validation
- invalid JSON
- missing Build 1
- missing Build 2
- analysis parser
- flaky test extraction
- consistent failure extraction
- malformed AI response
- API error handling

Do not over-engineer the testing setup.


==================================================
31. README
==================================================

Create/update README.md with:

1. Project overview
2. Architecture
3. Prerequisites
4. Installation
5. Environment variables
6. How to start Vite
7. How to configure Langflow
8. How the API call works
9. Expected Langflow response
10. Troubleshooting CORS
11. Production deployment notes

Clearly state:

React UI → Langflow API → FlakyTest_AI_Agent → AI response → React dashboard


==================================================
32. IMPORTANT IMPLEMENTATION RULE
==================================================

Before coding:

1. Inspect the existing repository.
2. Inspect FlakyTest_AI_Agent.json.
3. Identify whether any existing Langflow API integration already exists.
4. Identify existing project conventions.
5. Reuse existing components/utilities where appropriate.
6. Do not unnecessarily rewrite existing code.

Then implement the UI.

Do not ask me unnecessary questions if the repository already contains enough information to proceed.

If an API detail genuinely cannot be determined from the repository/export, isolate that uncertainty inside the API service and make it configurable rather than scattering assumptions throughout the application.


==================================================
33. FINAL ACCEPTANCE CRITERIA
==================================================

The implementation is complete only when:

[ ] React + Vite application runs successfully.

[ ] User can upload Build 1 result.json.

[ ] User can upload Build 2 result.json.

[ ] Invalid JSON is rejected.

[ ] Analyze button remains disabled until both files are valid.

[ ] Clicking Analyze calls the existing Langflow FlakyTest_AI_Agent.

[ ] Both JSON contents are passed as file1 and file2.

[ ] No flakiness logic is duplicated in React.

[ ] Langflow response is displayed.

[ ] Flaky tests are displayed separately.

[ ] Consistent failures are displayed separately.

[ ] Rerun recommendation is displayed.

[ ] Suite summary is displayed.

[ ] Raw AI response can be inspected.

[ ] Build JSON can be inspected.

[ ] Errors are handled gracefully.

[ ] User can start a new analysis.

[ ] Environment variables are used for configuration.

[ ] No secrets are committed.

[ ] README documents setup.

[ ] Code is TypeScript and maintainable.

[ ] UI looks like a professional enterprise QA reliability tool.

==================================================
34. MOST IMPORTANT ARCHITECTURAL PRINCIPLE
==================================================

Keep this boundary:

                    REACT
                       │
                       │
                Upload 2 JSON files
                       │
                       ▼
                LANGFLOW API
                       │
                       ▼
              FlakyTest_AI_Agent
                       │
                       ▼
                  LLM ANALYSIS
                       │
                       ▼
                 AI RESPONSE
                       │
                       ▼
                    REACT
                       │
                       ▼
              ENTERPRISE DASHBOARD

React is responsible for:

- UX
- file handling
- validation
- API communication
- loading/error states
- response rendering

Langflow is responsible for:

- prompt
- AI reasoning
- flaky test classification
- consistent failure classification
- root cause hypotheses
- recommendations
- suite health analysis

Do not move Langflow intelligence into the frontend.

Start by inspecting the repository and the supplied Langflow export, then implement the application end-to-end.