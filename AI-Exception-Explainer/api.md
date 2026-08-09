# API Documentation

Base URL: `http://localhost:8080`

All endpoints return JSON.

## POST /api/analyze

Analyzes pasted text. The input type (exception, log, SQL, API error, Playwright/Selenium failure) is **auto-detected** by the backend.

### Request

```json
{
  "exception": "java.lang.NullPointerException: Cannot invoke \"String.length()\" because \"s\" is null\n\tat com.example.Main.process(Main.java:42)",
  "provider": "OLLAMA",
  "model": "qwen3:8b"
}
```

| Field       | Type     | Required | Constraints                          |
| ----------- | -------- | -------- | ------------------------------------ |
| `exception` | string   | yes      | Non-empty, max 20000 characters      |
| `provider`  | string   | no       | `OLLAMA` or `GROQ`; defaults to `ollama` |
| `model`     | string   | no       | Provider model; defaults per Preferences |

### Response `200 OK`

```json
{
  "exceptionType": "NullPointerException",
  "rootCause": "The code tried to call length() on a null reference.",
  "technicalExplanation": "The JVM threw NullPointerException when invoking String.length() on a null object reference at Main.java:42.",
  "fix": "Add a null check before accessing s, e.g. if (s != null) { ... }",
  "bestPractices": [
    "Use Objects.requireNonNull for public API parameters",
    "Prefer Optional over nullable returns"
  ],
  "preventionTips": [
    "Initialize fields at declaration",
    "Validate input at method boundaries"
  ],
  "confidence": "HIGH",
  "analysisType": "EXCEPTION",
  "sections": []
}
```

| Field                    | Type     | Description                          |
| ------------------------ | -------- | ------------------------------------ |
| `exceptionType`          | string   | Type/name of the exception           |
| `rootCause`              | string   | Human-friendly root cause            |
| `technicalExplanation`   | string   | Technical detail of what happened    |
| `fix`                    | string   | Suggested fix, code when applicable  |
| `bestPractices`          | string[] | List of best practices               |
| `preventionTips`         | string[] | List of prevention tips              |
| `confidence`             | string   | `HIGH` \| `MEDIUM` \| `LOW`          |
| `analysisType`           | string   | `EXCEPTION` \| `LOG` \| `API_ERROR` \| `SQL` \| `PLAYWRIGHT` \| `SELENIUM` |
| `sections`               | object[] | Optional type-specific sections: `{title, content, items, kind}` |

### Error Responses

| Status | Scenario                        | Example `message`                              |
| ------ | ------------------------------- | ---------------------------------------------- |
| `400`  | Empty/missing `exception`       | `Exception text is required`                   |
| `400`  | `exception` too long            | `Exception text must not exceed 20000 characters` |
| `400`  | Invalid provider                | `Unsupported LLM provider: X`                  |
| `400`  | Invalid model for provider      | `No Ollama model selected. Open Settings...`   |
| `503`  | Ollama unavailable/timeout      | `Ollama is not reachable or could not complete the request...` |
| `503`  | Groq not configured             | `Groq is not configured. Set the GROQ_API_KEY...` |
| `502`  | Groq API failure                | `Groq could not complete the request...`       |
| `422`  | AI returned unparseable output  | `The AI returned a response that could not be parsed.` |
| `500`  | Unexpected server error         | `An unexpected error occurred. Please try again.` |

Error body shape:

```json
{
  "timestamp": "2026-08-02T10:00:00.000Z",
  "status": 503,
  "error": "Service Unavailable",
  "message": "Ollama is not reachable or could not complete the request. Verify that Ollama is running..."
}
```

## POST /api/analyze/file

Analyzes the text extracted from an uploaded file. Accepts text formats (`.txt`, `.log`, `.json`, `.md`, `.csv`, `.sql`, `.java`, `.py`, `.js`, `.ts`, `.html`, `.xml`, `.yml`, `.yaml`, `.properties`) and `.pdf`.

- Content-Type: `multipart/form-data`
- Parts: `file` (required), `provider` (optional), `model` (optional)

### Response

Same `200 OK` shape as `POST /api/analyze`.

| Status | Scenario                        |
| ------ | ------------------------------- |
| `400`  | Unsupported file type           |
| `422`  | File extraction failure (binary/empty) |
| `413`  | Upload exceeds 5MB              |

## POST /api/analyze/compare

Compares analysis across up to 4 models of the active provider.

### Request

```json
{
  "exception": "java.lang.NullPointerException: ...",
  "models": ["qwen3:8b", "bonsai:27b"]
}
```

### Response `200 OK`

```json
{
  "results": [
    {
      "provider": "OLLAMA",
      "model": "qwen3:8b",
      "analysis": { "exceptionType": "...", "...": "..." },
      "error": null
    },
    {
      "provider": "OLLAMA",
      "model": "bonsai:27b",
      "analysis": null,
      "error": "Ollama is not reachable..."
    }
  ]
}
```

Per-model failures are captured in the `error` field; the request itself never fails wholesale.

## GET /api/models

Lists models actually available for a provider. For Ollama, this calls the local `/api/tags` — no fabricated model names.

### Request

`GET /api/models?provider=OLLAMA`

### Response `200 OK`

```json
{
  "provider": "OLLAMA",
  "models": [{ "name": "qwen3:8b" }],
  "available": true,
  "message": null
}
```

If Ollama is unreachable:

```json
{
  "provider": "OLLAMA",
  "models": [],
  "available": false,
  "message": "Ollama is unavailable"
}
```

For Groq, models are the server-configured `groq.model` (or empty + `available: false` when the API key is missing). The API key is **never** returned.

## GET /api/preferences

Safe provider configuration status. Never returns secrets.

### Response `200 OK`

```json
{
  "provider": "GROQ",
  "configured": true,
  "model": "llama-3.3-70b-versatile"
}
```

## GET /api/health

Backend liveness probe used by the frontend.

### Response `200 OK`

```json
{
  "status": "UP"
}
```

## Notes

- The backend constructs a strict prompt instructing the model to return JSON only; unparseable responses are rejected with `422`.
- Ollama models are validated against the live local installation before analysis.
- The Groq API key is read from `GROQ_API_KEY` (environment) and is never exposed to the frontend.
- The frontend dev server (Vite, port 5173) proxies `/api` to this backend, so the browser never talks to the backend directly in development.
