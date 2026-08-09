# Architecture

## Overview

The AI Exception Explainer is a two-tier application: a React SPA (frontend) and a Spring Boot REST API (backend) that delegates analysis to pluggable LLM providers (local Ollama, or Groq via API key).

```
┌──────────────────┐         ┌──────────────────────┐         ┌────────────────┐
│   React (Vite)   │  HTTP   │    Spring Boot API   │  HTTP   │  Ollama (local)│
│   localhost:5173 │ ──────► │     localhost:8080   │ ──────► │ localhost:11434│
└──────────────────┘   JSON  └──────────────────────┘         └────────────────┘
                                  │                                    │
                                  ▼                                    │
                     AnalysisService (classify → analyze → parse)      │
                                  │                              ┌──────▼──────┐
                                  └─────────────────────────────►│ Groq (cloud)│
                                                                 └─────────────┘
```

## Backend Design

The backend follows **clean architecture** with strict separation of concerns:

```
controller/        HTTP layer — REST endpoints, DTOs, validation, error mapping
controller/dto/    Request/response payloads (records)
service/           Application logic — orchestration, parsing, analyzers, classifier
service/analyzer/  Strategy per AnalysisType (prompt + parse)
service/classifier/ Heuristic auto-detection of input type
service/extraction/ File/PDF text extraction
service/llm/       LLM provider abstraction (Ollama, Groq) + model discovery
domain/            Pure domain model — Analysis, AnalysisType, Confidence, LlmProvider
ollama/            Infrastructure — Ollama REST transport (WebClient)
config/            Wiring — CORS, properties, beans
```

### Dependency flow

- **Controller** depends on **Service** (never the reverse)
- **Service** orchestrates: `InputClassifier` → `AnalyzerRegistry` → `LlmClientRegistry` → `JsonResponseParser`
- **Analyzers and classifier are provider-independent** — they never reference Ollama or Groq
- **`LlmClient`** is the only layer that knows about providers; Groq's API key stays server-side
- **Domain** has no dependencies — it is a pure model
- **DTOs** are only used at the HTTP boundary, keeping the domain clean

### The analysis pipeline

```
Input
  ↓
Classify (HeuristicInputClassifier → AnalysisType)
  ↓
Select Analyzer (AnalyzerRegistry → prompt + parse)
  ↓
Resolve LLM Provider (LlmClientRegistry → LlmClient)
  ↓
Generate (Ollama /api/generate | Groq /chat/completions)
  ↓
Parse structured JSON (JsonResponseParser → Analysis)
  ↓
Render (frontend ResultCard / CompareResults)
```

### Key principles applied

- **SOLID** — single-responsibility classes, interface-based clients, dependency injection
- **Strategy pattern** — one `Analyzer` per `AnalysisType` (exception, log, SQL, API error, Playwright, Selenium)
- **Records** for immutable DTOs and value objects
- **Reactive WebClient** for non-blocking calls with explicit timeouts
- **Global exception handler** maps failures to consistent, friendly JSON errors
- **Configuration-driven** — all provider settings come from `application.properties`
- **Security** — the Groq API key is read from `GROQ_API_KEY` (env), never logged, never returned by any endpoint

## Frontend Design

```
src/
├── App.jsx             Root component — state & orchestration
├── services/api.js     Backend client (fetch wrapper)
└── components/
    ├── Hero.jsx            Title, subtitle, backend status
    ├── AnalyzerForm.jsx    Textarea, file drop zone, compare mode, actions
    ├── FileDropZone.jsx    Drag-and-drop file upload
    ├── SettingsModal.jsx   Preferences — provider (Ollama/Groq) + model selection
    ├── ResultCard.jsx      Structured analysis display (+ analysisType chip, sections)
    ├── CompareResults.jsx  Grid of per-model results
    ├── ErrorBanner.jsx     Friendly error presentation
    ├── LoadingSpinner.jsx  Reusable spinner
    └── Footer.jsx
```

### Principles applied

- **Reusable components** — each UI piece is a focused, prop-driven component
- **Single state source** in `App.jsx`, passed down via props
- **Provider/model config lives in Settings** — the main form stays focused on input + Analyze
- **Live model discovery** — Ollama models are fetched from `GET /api/models`, never hardcoded
- **Preferences persisted in localStorage** (provider + selected Ollama model only — never secrets)
- **CSS custom properties** (`:root` design tokens) for a consistent dark theme
- **Graceful states** — loading, error, empty, success are all handled
- The Vite dev server proxies `/api` to the backend, so no CORS issues in development

## Data Flow

1. User pastes text (or uploads a file) and clicks **Analyze**
2. `App.jsx` calls `analyzeText` / `analyzeFile` / `compareModels` in `services/api.js`
3. Backend `AnalysisController` validates the request (non-empty, max 20k chars)
4. `HeuristicInputClassifier` detects the input type
5. The matching `Analyzer` builds a persona-specific prompt requiring **JSON-only output**
6. `LlmClientRegistry` resolves the provider (`OllamaLlmClient` or `GroqLlmClient`)
7. The provider calls the LLM (Ollama `/api/generate` or Groq `/chat/completions`)
8. `JsonResponseParser` extracts and parses JSON, tolerates markdown fences, falls back safely
9. Response is mapped to the `AnalyzeResponse` DTO and returned to the frontend
10. `ResultCard` (or `CompareResults` grid) renders the structured analysis

## Extensibility

| Future feature      | Where it plugs in                                        |
| ------------------- | -------------------------------------------------------- |
| New analysis type   | New `Analyzer` bean + classifier rule                    |
| New LLM provider    | New `LlmClient` implementation + registry entry          |
| Streaming output    | Add a streaming method to `LlmClient`                    |
| Model fallback chain| Extend `AnalysisService.resolveModel`                    |
| Chat/debug assistant| Reuse analyzer + parser, add a chat endpoint             |

## Configuration

All knobs live in `application.properties` (see [`README.md`](README.md#configuration)):

- `ai.default-provider` — default provider when a request omits it
- `ollama.*` — base URL, optional fallback model, timeout, tokens, temperature
- `groq.*` — base URL, `api-key=${GROQ_API_KEY:}`, `model=${GROQ_MODEL:}`, timeout, tokens, temperature
- `app.max-compare-models` — comparison cap (4)
- `app.allowed-file-extensions` — upload allowlist
- `spring.servlet.multipart.*` — upload size limits
