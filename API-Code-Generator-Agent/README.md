# API Code Generator Agent — Swagger Assistant

Turn an OpenAPI/Swagger contract into a measurable, comprehensive, runnable API test project.

The system combines deterministic QA logic (parsing, `$ref` resolution, scenario generation, coverage) with LLM intelligence (DeepSeek V4 Flash via LangFlow) for framework-specific code generation.

## What it does

- Accepts OpenAPI 3.x and Swagger 2.0 specs as JSON or YAML (`.yml` files included).
- Ingests specs via file upload or URL.
- Resolves `$ref` (local, nested, and remote) and normalizes the spec into a compact manifest.
- Deterministically generates contract-driven test scenarios: happy path, documented responses, missing required fields, boundary values, invalid types, enums, and authentication.
- Generates runnable projects for Playwright, REST Assured, Karate, and Supertest.
- Produces a coverage report that never claims false 100%.

## Generated Playwright project

Playwright output is enterprise-grade and follows standard TypeScript practices:

```text
api-tests/
├── package.json              test / typecheck / lint / format scripts
├── tsconfig.json
├── eslint.config.mjs
├── .prettierrc.json
├── .gitignore
├── playwright.config.ts      baseURL + auth headers from environment
├── config/env.ts             typed environment configuration
├── types/api.ts              TypeScript models derived from the contract
├── lib/api/<tag>.client.ts   typed API client per resource
├── lib/factories/<tag>.factory.ts  schema-driven test data factories
├── tests/<tag>.spec.ts       one spec per resource/tag
├── .env.example
└── README.md
```

Generated tests:

- have a single import block per file (no repeated imports),
- read the base URL from Playwright config and never hardcode URLs,
- substitute every `{param}` path placeholder with a contract-derived value,
- send valid request bodies built from the contract schema (examples, defaults, enums first),
- assert documented status codes instead of hardcoded 200s,
- validate response body shapes against the documented schema,
- handle authentication via environment variables and skip tests that require unconfigured credentials,
- include negative tests derived from the deterministic scenario matrix,
- clean up created resources where the contract supports deletion.

Generated projects compile clean (`tsc --noEmit`) and pass `eslint .` out of the box.

## Architecture

```text
React (Vite + TypeScript)
   →  Backend (Fastify + TypeScript)
        →  LangFlow  →  DeepSeek V4 Flash
        →  PostgreSQL (Prisma)
        →  Local filesystem (ZIP output)
```

## Project structure

```text
frontend/   React + Vite + TypeScript + Tailwind
backend/    Fastify + TypeScript (parser, scenarios, generators, assembly, LangFlow)
prisma/     Prisma schema for PostgreSQL
langflow/   Importable LangFlow workflow JSON
storage/    Runtime uploads + generated projects
```

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL)
- LangFlow 1.11.x (optional for the LLM generation path)

## Setup

### One-shot start (recommended)

From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

This starts PostgreSQL, the backend, and the frontend together.

### One-shot stop

```powershell
powershell -ExecutionPolicy Bypass -File .\stop.ps1
```

This stops the frontend, backend, and database.

### Manual setup

First-time only (dependencies + database schema):

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
cd ../frontend
npm install
cd ..
```

Then start each service in a separate terminal (from the project root):

```bash
docker compose up -d db
cd backend && npm run dev
cd frontend && npm run dev
```

Open http://localhost:5173.

## Environment variables

See `backend/.env.example` and `frontend/.env.example`.

Key LangFlow variables (backend `.env`):

```env
LANGFLOW_BASE_URL=http://localhost:7860
LANGFLOW_FLOW_ID=
LANGFLOW_API_KEY=
```

## LangFlow workflow

Import `langflow/api-code-generator-agent.json` into LangFlow Desktop 1.11.x.

The workflow:

1. `OpenAPI Spec Parser` (custom component) — reads URL or uploaded file, parses JSON/YAML, emits a normalized manifest.
2. `Prompt Template` — injects manifest + task.
3. `Agent` (DeepSeek V4 Flash) — generates framework-specific code as structured JSON.
4. `Write File` — persists the generated project.
5. `Chat Output` — returns the result to the Playground.

## Testing

```bash
cd backend
npm test          # unit + route tests
npm run lint
npm run typecheck
npm run build

cd ../frontend
npm run lint
npm run typecheck
npm run build
```

## Verification

The system is verified against:

1. Petstore URL generation (`framework=playwright spec=https://petstore.swagger.io/v2/swagger.json`).
2. Uploaded YAML with `$ref` resolution.
3. REST Assured, Karate, and Supertest project generation.
4. Missing-input and invalid-spec error handling.
5. Incomplete coverage reporting.