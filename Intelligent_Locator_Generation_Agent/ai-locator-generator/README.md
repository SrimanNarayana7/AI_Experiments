# AI Locator Generator

Production-style AI developer tool: a tester pastes raw HTML/DOM (or a page URL), picks a target automation framework and language, and gets AI-generated, ranked, stable element locators — with explanations, fallback strategies, stability scoring, and a complete, ready-to-paste Page Object class.

```text
INPUT DOM  ->  ANALYZE  ->  ANALYSIS  ->  ELEMENT LOCATORS  ->  PAGE OBJECT
```

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [One-shot start](#one-shot-start)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [LangFlow setup](#langflow-setup)
- [Large DOM handling](#large-dom-handling)
- [API](#api)
- [Frontend overview](#frontend-overview)
- [Project layout](#project-layout)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## What it does

1. **DOM input** — paste raw HTML/DOM in an editor-style panel (line numbers, character count, sample/paste/clear) or provide a page URL fetched server-side.
2. **Deterministic extraction** — the backend strips scripts/styles and extracts every interactive element (`button`, `input`, `a`, `select`, …) with locator-friendly attributes (`id`, `name`, `role`, `aria-*`, `data-testid`, `data-cy`, …).
3. **AI locator analysis** — the LangFlow flow scores candidate locator strategies per element (uniqueness, stability, readability, specificity, framework suitability) and picks the best primary locator plus ranked fallbacks, with reasons and risks.
4. **Page Object generation** — the flow emits a complete, compilable Page Object class containing every element as a field; the backend guarantees one exists (auto-assembles from per-element snippets if the model ever omits it).
5. **Structured results UI** — stability scores with animated bars, clickable insights, per-element cards with expandable alternatives, a Page Object viewer with language tabs/regenerate/download, and a raw JSON view.

## Architecture

```text
React + Vite + TypeScript UI (:5173)
      |
      | POST /api/analyze
      v
Backend adapter — Node/Express + TypeScript (:4000)
      |
      +--> Input validation (framework/language combos, HTML size)
      |
      +--> DOM extraction/normalization (cheerio)
      |
      +--> LangFlow run (envelope: framework, language, elementList, warnings)
      |       |
      |       v
      |   LangFlow Desktop (:7860) — AI Locator Analyzer flow
      |       Chat Input -> DOM Processor -> Locator Prompt
      |       -> Chat Model -> JSON Response Parser -> Chat Output
      |
      +--> Strict JSON schema validation + score clamping + POM guarantee
      |
      v
Premium results dashboard (tabs: Overview / Elements / Page Object / Raw JSON)
```

LLM and LangFlow API keys stay server-side. The frontend only ever talks to the backend adapter.

## One-shot start

From the project root (`ai-locator-generator/`):

```powershell
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

The script:

1. Installs `backend/` and `frontend/` dependencies if missing.
2. Starts the backend in a new PowerShell window → http://localhost:4000.
3. Starts the frontend in a new PowerShell window → http://localhost:5173.
4. Prints the backend health check once it is reachable.

Stop both servers:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-all.ps1
```

`stop-all.ps1` kills whatever listens on ports 4000 and 5173; LangFlow Desktop is left running.

## Prerequisites

| Requirement | Version / Notes |
|---|---|
| Node.js | 18+ (20+ recommended) |
| npm | ships with Node |
| LangFlow Desktop | 1.11.x, running at `http://localhost:7860` |
| The `AI Locator Analyzer` flow | imported once into LangFlow Desktop (see below) |
| A model with API key | e.g. OpenAI-compatible `deepseek-chat` (flow default) |

## Configuration

Backend configuration lives in `backend/.env` (copy `backend/.env.example` and edit):

| Variable | Values / default |
|---|---|
| `LLM_PROVIDER` | `openai` \| `anthropic` \| `langflow` \| `mock` |
| `OPENAI_API_KEY` | OpenAI-compatible API key |
| `OPENAI_MODEL` | default `gpt-4o-mini` |
| `OPENAI_BASE_URL` | optional OpenAI-compatible base URL |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ANTHROPIC_MODEL` | default `claude-sonnet-4-5` |
| `LANGFLOW_BASE_URL` | default `http://localhost:7860` |
| `LANGFLOW_FLOW_ID` | flow id after importing into LangFlow Desktop |
| `LANGFLOW_API_KEY` | LangFlow API key (Desktop 1.11 requires one) |
| `LANGFLOW_TIMEOUT_MS` | default `120000` |
| `PORT` | backend port, default `4000` |
| `BATCH_MAX_TOKENS` | token budget per LangFlow batch, default `6000` |
| `BATCH_MAX_BATCHES` | hard cap on batch count, default `12` |
| `BATCH_CONCURRENCY` | concurrent batch requests, default `3` |

Frontend: `VITE_API_URL` defaults to `http://localhost:4000`; the Vite dev server proxies `/api` to it, so no frontend env file is needed for local development.

Use `LLM_PROVIDER=mock` to run without any key — it returns a deterministic sample analysis for UI development and end-to-end testing.

## LangFlow setup

1. Install and start **LangFlow Desktop 1.11.x**. It serves `http://localhost:7860`.
2. **New Project → Import** and select `langflow/flows/ai_locator_analyzer.json`. Importing also installs the two custom components (**DOM Processor**, **JSON Response Parser**) into Desktop.
3. Open the **AI Locator Analyzer** node and pick your model (ships as OpenAI-compatible `deepseek-chat`). Set the provider API key in LangFlow global variables or the node's `API Key` field.
4. Create an API key in **Settings → API Keys** (Desktop requires one to call the run endpoint).
5. Copy the **flow id** from the flow URL and the API key into `backend/.env`:

```env
LLM_PROVIDER=langflow
LANGFLOW_BASE_URL=http://localhost:7860
LANGFLOW_FLOW_ID=<flow id from the URL>
LANGFLOW_API_KEY=<LangFlow API key>
```

Flow pipeline: **Chat Input → DOM Processor → Locator Analysis Prompt → Chat Model → JSON Response Parser → Chat Output**. The backend sends a JSON envelope (`framework`, `language`, `elementList`, `warnings`, `sourceNote`) as the run `input_value` — no LangFlow tweaks needed. Everything else (validation, extraction, schema checks, POM guarantee) stays deterministic on the backend side. See `langflow/README.md` for full details.

## Large DOM handling

The pipeline never fails just because the HTML is large:

1. **Deterministic extraction** — cheerio extracts every interactive element with stable ids (`el-0000`, `el-0001`, …) and structural context (form, section, nav/header/footer, tablist, repeated class signature).
2. **Token budgeting** — each batch is estimated with a ~4 chars/token heuristic against `BATCH_MAX_TOKENS`.
3. **Structural batching** — if the element list exceeds the budget, it is split on element boundaries (never raw character ranges), keeps related controls (same form/section) together, and respects `BATCH_MAX_BATCHES` by growing the per-batch budget instead.
4. **Concurrent batch runs** — batches run through LangFlow with bounded concurrency (`BATCH_CONCURRENCY`) and one retry per failed batch.
5. **Merge + global ranking** — batch results are merged by element id, deduplicated, deterministically validated, and ranked once globally; the summary is recomputed from final scores.

For long-running batched runs the API switches to a job model (see [API](#api)); the UI shows per-batch progress.

Deterministic locator validation (against the original DOM) runs for every primary locator: selector syntax, attribute existence, uniqueness, match against the intended element, duplicate selectors, and fragile generated classes (CSS-in-JS hashes). Each element carries a `validation` result and a combined `finalScore` (AI score adjusted by objective checks).

## API

### Analyze

`POST /api/analyze`

```json
{
  "html": "<button id='login'>Login</button>",
  "framework": "playwright",
  "language": "typescript"
}
```

Only `html` XOR `pageUrl` is required. Supported frameworks: `selenium`, `playwright`, `cypress`. Supported languages: `java`, `python`, `javascript`, `typescript`, `csharp` (Cypress supports `javascript`/`typescript` only).

Small DOMs complete synchronously:

```json
{
  "success": true,
  "status": "completed",
  "analysisId": "…",
  "analysis": { "summary": { … }, "elements": [ … ], "pageObjectClass": { … } },
  "files": [ { "path": "src/pages/LoginPage.ts", "content": "…", "kind": "page" } ],
  "project": { "pages": 1, "components": 1, "tabs": 0, "elementsAnalyzed": 4, "stable": 2, "avgScore": 88, "fileCount": 6 },
  "processing": { "batched": false, "batchCount": 1, "elementsExtracted": 4, "completedBatches": 0 },
  "domStats": { "htmlChars": 301, "estimatedTokens": 64 }
}
```

Large DOMs (batched) return `202` immediately:

```json
{
  "success": true,
  "analysisId": "…",
  "status": "processing",
  "processing": { "batched": true, "batchCount": 8, "elementsExtracted": 127, "completedBatches": 0 },
  "domStats": { "htmlChars": 1840000, "estimatedTokens": 42000 }
}
```

Then poll:

- `GET /api/analyze/{analysisId}` — `{ status: "processing" | "completed" | "failed", processing, analysis?, files?, project?, error? }`
- `GET /api/analyze/{analysisId}/download` — the complete automation project as `ai-locator-project.zip`

`GET /api/health` returns `{ "status": "ok", "provider": "langflow" }`.

The ZIP contains the generated multi-file project: `README.md`, build configuration (`pom.xml` / `package.json` / `requirements.txt`), source files under `src/pages|components|tabs/`, and `locator-report.json` (full element-level report with ownership, validation, and scores). Filenames are sanitized and path traversal is blocked.

## Frontend overview

- **TopNav** — brand, API status indicator with pulse, framework/language selectors, dark/light theme toggle.
- **DOM Input** — editor-style panel (line numbers, char/line count, paste/sample/clear) and a Page URL mode that fetches static HTML server-side.
- **Analyze DOM** — gradient primary CTA with loading shimmer and spinner.
- **Analysis panel** — metric cards (elements, stable, stability), animated stability bar, "completed in Xs", and clickable insights that filter results (highly stable / structural selectors / needs `data-testid`).
- **Results tabs**
  - **Overview** — metrics, insights, top locators.
  - **Elements** — per-element cards: tag icon, stability score bar, recommended badge, locator with copy, expandable alternatives, risks.
  - **Page Object** — complete class with language tabs (re-runs analysis for the chosen language), Regenerate, Download, copy, expand/collapse.
  - **Raw JSON** — collapsible colorized JSON viewer.
- All states covered: empty (sample CTA), animated loading steps, premium error panel with Retry/Clear, smooth success transition.

## Project layout

```text
ai-locator-generator/
├── README.md          # this file
├── start-all.ps1      # one-shot start (backend + frontend)
├── stop-all.ps1       # stop both servers
├── backend/           # Express + TypeScript adapter
│   ├── src/
│   │   ├── services/     # analyze orchestration, batching, input validation
│   │   ├── analysis/     # batch merge, deterministic locator validation, job store
│   │   ├── dom/          # cheerio extraction, token estimator, context-aware chunker
│   │   ├── langflow/     # LangFlow run client + batch runner + response parsing
│   │   ├── llm/          # OpenAI/Anthropic clients + mock provider
│   │   ├── pom/          # page/component/tab model, project generator, POM guarantee, ZIP export
│   │   ├── prompt/       # system/user prompt builders
│   │   ├── validation/   # zod schema + JSON repair
│   │   └── url/          # static page fetcher (SSRF-guarded)
│   ├── test/             # vitest unit tests
│   └── .env.example
├── frontend/          # React + Vite + TypeScript + Tailwind v4 + Framer Motion
│   └── src/
│       ├── components/
│       │   ├── layout/     # AppShell, TopNav
│       │   ├── input/      # DomEditor, UrlInput, InputToolbar
│       │   ├── analysis/   # AnalysisSummary, InsightList, StabilityScore
│       │   ├── locators/   # LocatorCard (validation badges, copy class snippet)
│       │   ├── code/       # CodeViewer, PageObjectViewer, JsonViewer
│       │   └── common/     # Button, CopyButton, Badge, Tabs, Tooltip, StatusIndicator
│       ├── hooks/          # useLocatorAnalysis (polling for batched runs)
│       ├── pages/          # LocatorGenerator (Files tab, ZIP download, batch progress)
│       ├── services/       # api.ts
│       └── types/          # locator.ts
└── langflow/          # importable flow JSON + prompt artifact
    ├── flows/ai_locator_analyzer.json
    └── prompts/locator_analysis.md
```

## Development

```bash
# backend (http://localhost:4000)
cd backend
npm install
npm run dev        # tsx watch

# frontend (http://localhost:5173)
cd frontend
npm install
npm run dev        # vite

# checks
cd backend  && npm run typecheck && npm test
cd frontend && npm run build
```

Backend unit tests (vitest) cover token estimation, DOM chunking (order/ids/batch cap), batch merge, deterministic locator validation, page/component/tab inference, ZIP path-traversal protection, and URL SSRF guards.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Langflow workflow not found. Check the flow id.` | The flow was re-imported and got a new id. Update `LANGFLOW_FLOW_ID` in `backend/.env` and restart the backend. |
| `Langflow rejected the API key.` | Create/refresh the API key in LangFlow Desktop → Settings → API Keys and update `LANGFLOW_API_KEY`. |
| `Unable to reach Langflow.` | Start LangFlow Desktop and confirm `http://localhost:7860/health` returns `{"status":"ok"}`. |
| `No interactive elements found.` | The HTML has no buttons/links/inputs/selects/textareas, or a URL was supplied but the page is JS-rendered (paste the rendered DOM instead). |
| Ports already in use | Run `stop-all.ps1`, or free ports 4000/5173 manually. |
