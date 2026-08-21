# AI Bug Triage

Enterprise AI-powered Jira defect analysis. A React + Vite + TypeScript frontend that calls an existing **Langflow** bug triage workflow (the exported `Bug Triage AI Agent.json` flow) and renders the triage result in a professional QA engineering dashboard.

The app is intentionally only the **presentation and integration layer** — all Jira fetching, LLM reasoning, severity/priority logic, and root-cause analysis happens inside the Langflow workflow.

## Architecture

```
React (this app)
  │  POST {base}/api/v1/run/{FLOW_ID}?stream=false
  ▼
Langflow Bug Triage workflow (API Request → Parser → Prompt Template → Agent → Chat Output)
  │
  ▼
Jira + LLM
```

## Features

- **Jira issue input** — enter any defect key (e.g. `KAN-13`, `VWO-24`, `PROJ-123`); validates format and supports Enter to submit
- **Dynamic issue resolution** — the entered key is applied via Langflow `tweaks` so the workflow fetches *that* issue instead of the hardcoded one
- **Enterprise triage dashboard** — severity (S1–S3) and priority (P1–P3) cards with confidence and reasoning, impact-area tags, root-cause analysis (confirmed facts / hypothesis / unknowns / evidence), and triage justification
- **Markdown report parser** — normalizes the workflow's free-form markdown report into the structured `BugTriageResult` model, tolerant of both report formats the workflow produces
- **Friendly error handling** — clear messages for unavailable service, timeouts, unauthorized/forbidden, invalid responses, and **issue-not-found** (e.g. `KAN-15` → "The Jira issue you entered could not be found…")
- **Dark/light themes**, responsive layout, accessible controls (ARIA live regions, focus states, semantic HTML)

## Getting started

```bash
npm install
cp .env.example .env        # then edit as needed
npm run dev                 # http://localhost:5174 (strictPort)
```

The dev server runs on **port 5174** (`strictPort`). Other projects in this repo
use distinct ports so they can run side by side:

| Project | Dev port |
| --- | --- |
| AI-Exception-Explainer | 5173 |
| Bug-Triage-Agent | 5174 |
| Flaky-Test-Analyser-Agent | 5175 |

Production build:

```bash
npm run build
npm run preview
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_LANGFLOW_BASE_URL` | `http://localhost:7860` | Langflow server origin |
| `VITE_LANGFLOW_FLOW_ID` | `8886e711-61a0-43f3-b70f-ddb7efab335e` | Bug Triage workflow id |
| `VITE_LANGFLOW_API_KEY` | unset | Optional browser-safe key (dev/localhost only) |
| `VITE_LANGFLOW_PROXY_URL` | unset | Optional secure proxy that holds the key server-side |

> **Security:** the Langflow API key is a credential. Do **not** ship it in a `VITE_*` variable for a real deployment — `VITE_*` values are embedded in the client bundle. For production, run a minimal proxy that injects `x-api-key` server-side and set `VITE_LANGFLOW_PROXY_URL`. The `VITE_LANGFLOW_API_KEY` path is provided only for localhost/dev Langflow instances explicitly configured for browser-safe auth. Your local `.env` is gitignored; `.env.example` holds placeholders only.

## API contract

`POST {VITE_LANGFLOW_BASE_URL}/api/v1/run/{VITE_LANGFLOW_FLOW_ID}?stream=false`

Headers: `Content-Type: application/json` and, when configured, `x-api-key`.

```json
{
  "output_type": "chat",
  "input_type": "text",
  "input_value": "KAN-13",
  "session_id": "KAN-13-a1b2c3d4",
  "tweaks": {
    "APIRequest-SSM1A": {
      "url_input": "https://sriman7.atlassian.net/rest/api/3/issue/KAN-13"
    }
  }
}
```

The `tweaks` block is the key to dynamic issues: the workflow's **API Request node hardcodes one Jira URL**, so `input_value` alone only reaches the prompt text. Overriding `APIRequest-SSM1A.url_input` at run time makes Langflow fetch the issue the user actually entered. (If the workflow is re-exported with a different node id, update `API_REQUEST_NODE_ID` in `src/services/langflow/index.ts`.)

The UI never talks to Jira directly and never contains triage logic — it only sends the issue key and renders what Langflow returns.

## Response normalization

`src/services/langflow/normalize.ts` extracts the Agent/Chat Output content from `outputs[].outputs[].results.message.data.text` and supports two shapes:

1. **Structured JSON** (object / JSON string / fenced JSON block)
2. **Markdown triage report** (`src/services/langflow/markdown.ts`) — the format the workflow actually produces, e.g. `# Triage: KAN-13 — <summary>` or `# Triage Analysis — KAN-14`, with `## SEVERITY`, `## PRIORITY`, `## IMPACT_AREAS`, `## ROOT_CAUSE_ANALYSIS`, `## JUSTIFICATION` sections

If Langflow reports the issue cannot be triaged (e.g. *"Issue does not exist or you do not have permission to see it"*), the normalizer throws a `TriageError` with code `ISSUE_NOT_FOUND`, which the UI renders as a friendly warning with a retry action. Missing or malformed data surfaces a meaningful error instead of being silently fabricated.

The normalized model (`src/types/triage.ts`):

```ts
interface BugTriageResult {
  issue_key: string;
  summary: string;
  issue_type?: string;
  status?: string;
  severity: { value: 'S1' | 'S2' | 'S3'; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  priority: { value: 'P1' | 'P2' | 'P3'; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  impact_areas: string[];
  root_cause_analysis: { confirmed_facts: string[]; hypothesis: string; unknowns: string[]; evidence_required: string[] };
  triage_justification: string;
}
```

## Project structure

```
src/
  components/
    layout/          App header / footer / main shell
    jira-input/      Issue key input with validation
    triage/          Result header, results composition, justification
    severity/        Severity card
    priority/        Priority card
    impact-areas/    Impact area tags
    root-cause/      Confirmed facts / hypothesis / unknowns / evidence
    loading/         Analysis loading state
    error/           Error card with retry
    empty-state/     Pre-analysis empty state
  pages/Dashboard/   Main dashboard page
  services/langflow/ API service (request, errors, markdown parser, normalization)
  types/triage.ts    Strict typed models
  utils/             Validation + Langflow response helpers
  config/            Runtime configuration from env vars
```

## Security notes

- The exported `Bug Triage AI Agent.json` previously contained a live Jira Basic auth token in the API Request headers; it has been **replaced with a placeholder** in this repo. Rotate that token in Jira if it was ever exposed, and re-enter the real credential only in your local Langflow instance (never commit it).
- Do not commit `.env` (gitignored). Keep only placeholders in `.env.example`.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck (`tsc -b`) + production build
- `npm run lint` — ESLint
- `npm run preview` — preview the production build
