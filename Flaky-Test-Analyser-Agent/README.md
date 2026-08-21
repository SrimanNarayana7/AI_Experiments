# Flaky Test Analyzer

Enterprise React + Vite + TypeScript frontend for the existing **FlakyTest_AI_Agent**
Langflow workflow. A QA/test engineer uploads two Playwright `result.json` files
(Build 1 baseline, Build 2 comparison), the app sends both to Langflow, and the
agent's flakiness analysis is rendered as a professional test-reliability dashboard.

```
React UI  →  Langflow API  →  FlakyTest_AI_Agent  →  AI response  →  React dashboard
```

The Langflow workflow (in `FlakyTest_AI_Agent.json`) remains the source of truth
for all AI/flakiness analysis. This frontend is only an orchestration and
presentation layer — it never duplicates the flakiness logic.

## Architecture

```
src/
  components/
    layout/        Header
    upload/        BuildUploadCard, BuildComparison
    analysis/      AnalysisDashboard, SummaryCards, SuiteHealth,
                   FlakyTestsTable, ConsistentFailuresTable,
                   Recommendations, AIAnalysis, BuildDetails
    common/        Button, StatusBadge, LoadingState, ErrorState, EmptyState
  pages/           FlakyTestAnalyzerPage
  services/        langflow/ (client, errors, normalize)
  hooks/           useFlakyTestAnalysis
  types/           flakyTest
  utils/           analysisParser, fileValidation, langflow
  config/          env
```

Data flow:

1. **Upload** — two Playwright `result.json` files (drag & drop or browse).
2. **Validate** — `.json` extension, valid JSON parse, size check (10 MB limit).
3. **Analyze** — both file contents are sent to Langflow as `file1` / `file2`
   via the workflow's Prompt Template tweaks.
4. **Normalize** — the agent's natural-language report (FLAKY_TESTS,
   CONSISTENT_FAILURES, RERUN_RECOMMENDATION, SUMMARY) is parsed into a typed
   result; unparsable responses fall back to the raw AI Analysis panel.
5. **Render** — summary cards, suite health, tables, recommendations, and
   inspectable raw AI response + build JSON.

## Prerequisites

- Node.js 20+ (built against Node 24)
- npm 10+
- A running Langflow instance with the **FlakyTest_AI_Agent** flow imported
  (flow ID `6bf6a234-da40-4dd7-8afd-8750d705e8ce`)

## Installation

```bash
npm install
```

## Environment variables

Copy `.env.example` to `.env.local` and adjust:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_LANGFLOW_API_URL` | Yes | Langflow server origin, e.g. `http://localhost:7860` |
| `VITE_LANGFLOW_FLOW_ID` | No | Defaults to the exported flow ID |
| `VITE_LANGFLOW_API_KEY` | No | Browser-safe API key (see security note below) |
| `VITE_LANGFLOW_PROXY_URL` | No | Secure proxy base URL that forwards to Langflow |
| `VITE_LANGFLOW_TIMEOUT_MS` | No | Analysis timeout, default `120000` |

**Security:** never put a real production secret in `VITE_LANGFLOW_API_KEY`.
Use the proxy option for production, or configure Langflow CORS properly.

## How to start Vite

```bash
npm run dev        # http://localhost:5175
npm run build      # production build to dist/
npm run typecheck  # tsc
npm run test       # vitest
npm run lint       # eslint
```

The dev server runs on **port 5175** (`strictPort`). The other projects in this
repo use distinct ports so they can run side by side:

| Project | Dev port |
| --- | --- |
| AI-Exception-Explainer | 5173 |
| Bug-Triage-Agent | 5174 |
| Flaky-Test-Analyser-Agent | 5175 |

## How to configure Langflow

1. Open Langflow and confirm the **FlakyTest_AI_Agent** flow is present
   (flow ID `6bf6a234-da40-4dd7-8afd-8750d705e8ce`).
2. Set `VITE_LANGFLOW_API_URL` to the Langflow origin (or use the proxy).
3. If Langflow requires a browser-safe key, set `VITE_LANGFLOW_API_KEY`.
4. Confirm the workflow's Agent node has a configured model provider and that
   the prompt template variables `{file1}` / `{file2}` are intact.

## How the API call works

`src/services/langflow/index.ts` implements `analyzeFlakyTests(build1Content, build2Content)`.

The request:

```
POST {VITE_LANGFLOW_API_URL}/api/v1/run/{FLOW_ID}?stream=false
```

Payload:

```json
{
  "output_type": "chat",
  "input_type": "text",
  "input_value": "Analyze flakiness across these two Playwright builds.",
  "session_id": "<unique>",
  "tweaks": {
    "Prompt Template-1C6TD": {
      "file1": "<full Build 1 result.json content>",
      "file2": "<full Build 2 result.json content>"
    }
  }
}
```

The `file1` / `file2` fields carry the **complete** Playwright result JSON so the
Prompt Template can feed both into the agent. No truncation, no double-stringify.

Optional `x-api-key` header is added when `VITE_LANGFLOW_API_KEY` is set.

Errors (HTTP 400/401/403/404/408/429/5xx, timeout, network failure, malformed
response) are mapped to user-safe `LangflowError` messages.

## Expected Langflow response

The agent returns a natural-language report with these sections:

```
FLAKY_TESTS
CONSISTENT_FAILURES
RERUN_RECOMMENDATION
SUMMARY
```

In practice the deployed flow emits numbered markdown headings (observed live):

```
## Test Reliability Comparison Report

### 1. FLAKY_TESTS
| Test | Hypothesis |
|---|---|
| `redirects to dashboard after successful login` (auth.spec.ts:60) | Timing: ... |

### 2. CONSISTENT_FAILURES (real bugs, failed in BOTH builds)
| Test | Root Cause |
|---|---|
| `renders revenue chart with correct totals` (dashboard.spec.ts:186) | ... |

### 3. RERUN_RECOMMENDATION
- **Rerun (flaky — quarantine, no code fix):**
  - `redirects to dashboard after successful login`
- **Send to engineering (reproducible bugs — fix required):**
  - `renders revenue chart with correct totals` — ...

### 4. SUMMARY
Build 1: 50 tests, 47 passed, 3 failed. Build 2: 50 tests, 48 passed, 2 failed. ...
```

The response is located at the Chat Output's `outputs[].outputs.message.message.text`
(or the legacy `outputs[].results.message.data.text` path) and parsed by
`src/utils/analysisParser.ts`. The parser tolerates markdown tables, bullet
lists, and plain "Name — cause" lines. If structured extraction fails, the app
shows the raw response in the **AI Analysis** panel instead of crashing.

## Troubleshooting CORS

The dev server runs on `http://localhost:5175`; Langflow on
`http://localhost:7860` by default. Browsers block cross-origin requests unless
CORS is configured. Options:

1. **Configure Langflow CORS** to allow the frontend origin.
2. **Use a dev proxy** — add to `vite.config.ts`:
   ```ts
   server: { proxy: { '/langflow': { target: 'http://localhost:7860', changeOrigin: true } } }
   ```
   and set `VITE_LANGFLOW_API_URL=/langflow`.
3. **Use a secure reverse proxy** (recommended for production) that forwards to
   Langflow and injects the API key server-side; set `VITE_LANGFLOW_PROXY_URL`.

Never disable browser security to work around CORS.

## Production deployment notes

- Build with `npm run build` and serve `dist/` from any static host.
- Route `/api/v1/run/*` to Langflow through a reverse proxy that holds the API
  key server-side, or configure Langflow CORS for the deployed origin.
- Environment variables are inlined at build time by Vite; keep `.env.local`
  out of version control (see `.gitignore`).
