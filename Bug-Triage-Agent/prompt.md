R — ROLE

You are a Senior Frontend Architect and Enterprise UI Engineer specializing in React, Vite, TypeScript, API integration, and QA engineering platforms.

Build an enterprise-grade React + Vite UI for an existing AI Bug Triage Langflow workflow.

The Langflow workflow already exists and must be treated as the backend AI service.

Do not recreate the Langflow workflow.

Do not implement the Jira API, Jira authentication, parsing, LLM logic, severity logic, priority logic, or root-cause reasoning in React.

The React application is only responsible for:
- User input
- Calling the existing Langflow API
- Handling loading/error states
- Parsing the Langflow response
- Presenting the bug triage result in an enterprise-grade UI.


I — INSTRUCTIONS

First inspect the existing repository.

The repository currently contains the exported Langflow workflow JSON, but there is no existing React implementation for this application.

Use the Langflow export JSON as the source of truth for understanding the existing workflow.

Do not modify or recreate the Langflow workflow.

Create a new React + Vite + TypeScript frontend application around the existing Langflow workflow.

The application name should be:

AI Bug Triage

The primary user journey is:

User enters Jira Bug issue key
        ↓
Click "Analyze Bug"
        ↓
React calls existing Langflow API
        ↓
Langflow executes existing Bug Triage workflow
        ↓
Langflow returns structured triage result
        ↓
React parses response
        ↓
Enterprise Bug Triage dashboard


C — CONTEXT

The existing Langflow workflow is:

API Request
    ↓
Parser
    ↓
Prompt Template
    ↓
Agent
    ↓
Chat Output

The Langflow workflow is responsible for retrieving and analyzing the Jira bug.

The Jira issue key should be supplied dynamically by the React application.

Example:

KAN-13

The existing Langflow API endpoint follows this structure:

POST
http://localhost:7860/api/v1/run/{FLOW_ID}?stream=false

The current flow ID is:

8886e711-61a0-43f3-b70f-ddb7efab335e

The generated Langflow request uses:

Content-Type: application/json

x-api-key: <LANGFLOW_API_KEY>

and the request body follows the existing Langflow contract:

{
  "output_type": "chat",
  "input_type": "text",
  "input_value": "<JIRA_ISSUE_KEY>",
  "session_id": "<SESSION_ID>"
}

Example:

{
  "output_type": "chat",
  "input_type": "text",
  "input_value": "KAN-13",
  "session_id": "KAN-13-unique-session-id"
}

Do not change this contract unless inspection of the existing Langflow export proves that a different payload is required.

The Langflow API key must NOT be hardcoded.

Use environment configuration.

Important:

Do not assume the raw Langflow response is already equal to the final JSON object.

Inspect the Langflow response format and create a response-normalization layer if necessary.


E — EXAMPLES

Example user interaction:

Input:

KAN-13

User clicks:

Analyze Bug

The UI calls the existing Langflow workflow.

The resulting triage is expected to contain information equivalent to:

{
  "issue_key": "KAN-13",
  "summary": "Login form allows sign-in attempt with blank credentials",
  "severity": {
    "value": "S3",
    "confidence": "HIGH",
    "reason": "..."
  },
  "priority": {
    "value": "P3",
    "confidence": "HIGH",
    "reason": "..."
  },
  "impact_areas": [
    "Login module",
    "Authentication UX",
    "Form validation"
  ],
  "root_cause_analysis": {
    "confirmed_facts": [
      "..."
    ],
    "hypothesis": "...",
    "unknowns": [
      "..."
    ],
    "evidence_required": [
      "..."
    ]
  },
  "triage_justification": "..."
}

This example is only to define the expected UI/data model.

Do not hardcode this result.

The actual data must come from Langflow.


P — PARAMETERS

TECHNOLOGY

Use:

- React
- Vite
- TypeScript
- React Router if routing is required
- Modern CSS or the existing styling solution
- Strict TypeScript
- ESLint
- Prettier

Do not use Next.js.

Do not use JavaScript.

Do not introduce unnecessary frameworks.

Before installing dependencies, inspect package.json and use existing dependencies where appropriate.


PROJECT STRUCTURE

Create a clean enterprise-oriented structure similar to:

src/
  components/
    layout/
    jira-input/
    triage/
    severity/
    priority/
    impact-areas/
    root-cause/
    loading/
    error/
  pages/
    Dashboard/
  services/
    langflow/
  types/
    triage.ts
  utils/
  hooks/
  config/
  App.tsx
  main.tsx

Adapt the structure to the project rather than blindly following it.


ENVIRONMENT CONFIGURATION

Use environment variables.

Create:

.env.example

with configuration similar to:

VITE_LANGFLOW_BASE_URL=http://localhost:7860
VITE_LANGFLOW_FLOW_ID=8886e711-61a0-43f3-b70f-ddb7efab335e
VITE_LANGFLOW_API_KEY=your-api-key

However, before implementing this, assess the security implications of exposing the Langflow API key through Vite.

If the Langflow API key is a secret credential, DO NOT expose it through VITE_* variables.

In that case, introduce a minimal backend/proxy only if necessary to keep the credential server-side.

Do not compromise security simply to avoid creating a small backend.

The preferred architecture is:

React
  ↓
Application API / secure proxy
  ↓
Langflow
  ↓
Jira + LLM

If the Langflow server is intentionally configured for browser-safe authentication, document that assumption clearly.


UI DESIGN

Create an enterprise-grade QA engineering dashboard.

The application should NOT look like a generic chatbot.

It should look like an internal enterprise quality engineering platform.

Use:

- Professional dark/light compatible design
- Clean enterprise typography
- Strong information hierarchy
- Subtle borders
- Moderate rounded corners
- Minimal shadows
- Responsive layout
- Accessible controls
- Clear status indicators
- High readability
- Consistent spacing
- No unnecessary animations


APPLICATION HEADER

Display:

AI Bug Triage

Subtitle:

Enterprise AI-powered Jira defect analysis


PRIMARY INPUT

Create a prominent Jira issue input area.

Label:

Jira Bug Issue Key

Placeholder:

KAN-13

Button:

Analyze Bug

Support pressing Enter to submit.

Validate empty input.

Show a clear validation message when required.

Do not make the validation excessively restrictive.

The user may enter Jira keys such as:

KAN-13
VWO-24
PROJ-123


LOADING STATE

After clicking Analyze Bug:

Disable duplicate submission.

Show:

Analyzing Bug...

Provide an enterprise-style loading state.

If practical, show:

Fetching Jira issue
Analyzing defect
Generating triage

Do not pretend these stages are independently confirmed if the frontend cannot actually observe them.

Use them as visual progress only when appropriate.


RESULT HEADER

After successful analysis, show:

Jira issue key

Issue summary

Issue type if available

Status if available


SEVERITY

Create a prominent Severity card.

Display:

S1 / S2 / S3

Human-readable meaning where appropriate.

Display confidence.

Display severity reasoning.

Example:

SEVERITY

S2

HIGH CONFIDENCE

Reason:
...


PRIORITY

Create a separate Priority card.

Display:

P1 / P2 / P3

Human-readable meaning where appropriate.

Display confidence.

Display priority reasoning.


IMPORTANT

Severity and Priority must be visually separated.

Do not assume Priority equals Severity.

Do not merge them into a single value.


IMPACT AREAS

Display impact areas as professional tags/badges.

Example:

Login
Authentication
Form Validation

The UI must dynamically render the array returned by Langflow.


ROOT CAUSE ANALYSIS

This is one of the most important sections.

Clearly separate:

CONFIRMED FACTS

ROOT CAUSE HYPOTHESIS

UNKNOWN INFORMATION

EVIDENCE REQUIRED

The hypothesis must never visually appear as a confirmed fact.

Use different visual hierarchy/labels to make the distinction obvious.


TRIAGE JUSTIFICATION

Display the final triage justification in a dedicated section.

Make it easy for a QA engineer or engineering manager to read quickly.


EMPTY STATE

Before analysis:

Show an intentional empty state.

Example:

Enter a Jira bug issue key to begin AI-powered triage.

Do not show fake data.


ERROR STATE

Handle:

- Invalid issue key
- Empty input
- Langflow unavailable
- Langflow timeout
- Unauthorized response
- Forbidden response
- Jira issue not found
- Invalid Langflow response
- Malformed JSON
- Network failure
- Unexpected server error

Show human-readable errors.

Never expose:

- API keys
- Authorization headers
- Stack traces
- Internal implementation details

Provide:

Retry

where appropriate.


API SERVICE

Do not put fetch logic directly inside the main React component.

Create a dedicated service:

langflowService

Conceptually:

analyzeBug(issueKey)

Responsibilities:

- Build request
- Send Jira issue key to Langflow
- Handle HTTP errors
- Parse response
- Normalize response
- Return typed data

The UI should not know Langflow's internal response structure.


TYPE SAFETY

Create strict TypeScript models.

Use a model equivalent to:

type Severity = "S1" | "S2" | "S3";

type Priority = "P1" | "P2" | "P3";

type Confidence = "HIGH" | "MEDIUM" | "LOW";

interface BugTriageResult {
  issue_key: string;
  summary: string;
  severity: {
    value: Severity;
    confidence: Confidence;
    reason: string;
  };
  priority: {
    value: Priority;
    confidence: Confidence;
    reason: string;
  };
  impact_areas: string[];
  root_cause_analysis: {
    confirmed_facts: string[];
    hypothesis: string;
    unknowns: string[];
    evidence_required: string[];
  };
  triage_justification: string;
}

Adapt this to the actual Langflow output if necessary.

Do not use:

any

unless absolutely unavoidable.


RESPONSE NORMALIZATION

The Langflow Chat Output may contain the JSON as a string inside a nested response.

Implement a robust normalization function.

The function should:

1. Receive the raw Langflow response.
2. Locate the Agent/Chat Output content.
3. Extract JSON if the model returned JSON as text.
4. Parse JSON.
5. Validate required fields.
6. Normalize property names if necessary.
7. Return BugTriageResult.

Do not silently manufacture missing values.

If required information is missing, surface a meaningful error.


SECURITY

Do not hardcode secrets.

Do not commit:

- Langflow API keys
- Jira API tokens
- Jira passwords
- Authentication headers

Do not store secrets in:

- localStorage
- sessionStorage
- URL parameters
- React state unnecessarily
- source code

Do not log authorization headers.


RESPONSIVENESS

The application must work well on:

- Desktop
- Laptop
- Tablet
- Mobile

Desktop should be the primary experience.

On smaller screens:

- Cards stack
- Input/button adapt
- Root cause sections remain readable
- No horizontal page overflow


ACCESSIBILITY

Implement:

- Semantic HTML
- Proper labels
- Keyboard navigation
- Visible focus states
- Accessible buttons
- Accessible form errors
- aria-live for dynamic analysis status
- Good contrast
- Do not rely solely on color


DO NOT OVERENGINEER

This is a focused Bug Triage UI.

Do not add:

- Authentication system
- User management
- Database
- Jira project management
- Issue creation
- Issue editing
- Complex state management
- Redux unless genuinely required
- Analytics
- Chatbot functionality

The application has one primary purpose:

Enter Jira bug → Analyze → Display AI triage.


OUTPUT

Implement the complete React + Vite + TypeScript UI in the existing repository.

Do not just provide code snippets.

Create the actual files.

Ensure:

npm install

and:

npm run dev

work.

Run:

- TypeScript checks
- ESLint
- Production build

Fix all errors before finishing.

Provide a concise final summary containing:

1. Files created
2. Files modified
3. Langflow integration endpoint
4. Environment variables required
5. Expected Langflow response structure
6. Any security considerations
7. Commands to run the application


T — TONE

Enterprise-grade.

Professional.

Clean.

Modern.

QA-engineering focused.

The UI should feel like an internal tool used by:

- QA Engineers
- Automation Engineers
- Developers
- Engineering Managers
- Test Leads

Do not make it look like a consumer chatbot.

Prioritize clarity, maintainability, security, accessibility, and correctness over decorative UI.

IMPORTANT:

Before writing code, inspect the repository and the Langflow export JSON.

Understand the existing Langflow API contract.

Do not recreate the Langflow workflow.

Do not implement bug-triage reasoning in React.

React is the presentation and integration layer.

Langflow remains the AI bug-triage engine.