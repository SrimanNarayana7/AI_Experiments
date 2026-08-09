# RICE-POT Master Prompt — AI Exception Explainer Release

## R — Role

You are a **senior full-stack AI engineer, Java Spring Boot architect, React engineer, and local-LLM integration specialist**.

You are modifying an existing project named **AI Exception Explainer**.

Your job is to implement the requested release carefully in the existing codebase, preserving working functionality and avoiding unnecessary rewrites.

You must first inspect the existing repository structure, current backend/frontend implementation, configuration, and tests before changing code.

---

## I — Instructions

Implement the following release in the existing AI Exception Explainer application.

### 1. Remove the current experiment label

The current home screen contains:

> `AI Engineering Experiment #1`

Remove this label completely.

Do not replace it with another experiment/version label.

Keep the main product identity:

> `AI Exception Explainer`

The existing single-screen experience should remain the primary workflow.

### 2. Add AI provider configuration

The application must support two LLM providers:

- `OLLAMA`
- `GROQ`

Users must be able to select the provider from a **Preferences / Settings page or a clean Settings popup/modal**.

Do not put provider/model configuration permanently on the main analysis form.

The main screen should focus on:

- input
- Analyze
- Clear
- results

### 3. Ollama configuration

When `OLLAMA` is selected:

- Show the Ollama configuration section.
- Retrieve the models actually installed on the user's local Ollama instance.
- Do NOT use hardcoded model placeholders such as `qwen3:8b`, `deepseek-64k`, etc.
- Do NOT show models that are not installed locally.
- Populate the model selector from Ollama's model-list API (`/api/tags` or the appropriate existing Ollama API).
- Allow the user to select one installed local model as the default analysis model.
- Refresh the model list from Ollama when requested.
- Handle Ollama being offline/unavailable gracefully.
- Show a useful empty state when Ollama is reachable but no models are installed.

The frontend must never invent model names.

### 4. Groq configuration

When `GROQ` is selected:

- The Groq API token MUST remain server-side.
- Read the token from `application.properties` / environment-backed Spring configuration.
- NEVER expose the token through the frontend.
- NEVER return the token from a configuration endpoint.
- NEVER log the token.
- Do not add a token input field to the UI.
- Show only a safe configuration status such as:
  - `Groq: Configured`
  - `Groq: API key not configured`
- The Groq model should be configured server-side through application properties unless the existing project already has a safe model-selection mechanism.

Recommended configuration shape:

```properties
ai.provider=ollama

ollama.base-url=http://localhost:11434

groq.base-url=https://api.groq.com/openai/v1
groq.api-key=${GROQ_API_KEY:}
groq.model=<configured-groq-model>
```

Do not hardcode a real secret.

### 5. Introduce a provider abstraction

Do not add provider-specific branching throughout `AnalysisService`.

Create a clean abstraction such as:

```java
public interface LlmClient {
    Mono<String> generate(LlmGenerateRequest request);
}
```

Implement provider-specific clients:

```text
OllamaLlmClient
GroqLlmClient
```

Create a provider resolver/factory/service that selects the appropriate client.

The existing analyzer/classifier architecture must remain reusable regardless of provider.

The pipeline should become:

```text
Input
  ↓
Classify
  ↓
Select Analyzer
  ↓
Build Prompt
  ↓
Select LLM Provider
  ↓
Generate
  ↓
Parse Structured JSON
  ↓
Render Result
```

### 6. Update the API contract safely

The existing request currently uses:

```json
{
  "exception": "...",
  "model": "..."
}
```

Do not unnecessarily break the existing API.

Extend it to support provider selection, for example:

```json
{
  "exception": "...",
  "provider": "OLLAMA",
  "model": "installed-model-name"
}
```

The backend must validate:

- provider is supported
- Ollama model exists when provider is Ollama
- Groq is configured when provider is Groq

Keep backwards compatibility where practical.

### 7. Add model discovery endpoint

Add a backend endpoint such as:

```text
GET /api/models
```

or an equivalent clean API.

For Ollama, the backend should call the local Ollama model-list endpoint and return only models that actually exist.

Example response:

```json
{
  "provider": "OLLAMA",
  "models": [
    {
      "name": "qwen3:8b"
    },
    {
      "name": "bonsai:27b"
    }
  ]
}
```

Do not fabricate models.

If Ollama is unavailable:

```json
{
  "provider": "OLLAMA",
  "models": [],
  "available": false,
  "message": "Ollama is unavailable"
}
```

Use the project's existing error-response conventions where possible.

### 8. Preferences UI

Create a polished Preferences/Settings experience.

Preferred structure:

```text
Settings
────────────────────────

AI Provider

(●) Ollama
( ) Groq

When Ollama:
  Ollama status: Connected
  Available local models:
  [ qwen3:8b ▼ ]

  [Refresh Models]

When Groq:
  Groq status: Configured
  Model: <server-configured model>

[Save Preferences]
```

The exact visual design should match the existing dark/purple application theme.

Persist non-secret preferences locally if appropriate, such as:

```text
provider
selectedOllamaModel
```

Do not persist or expose the Groq API key in browser storage.

### 9. Main screen

Keep the current single-screen workflow.

Remove:

```text
AI Engineering Experiment #1
```

Keep:

```text
AI Exception Explainer
Understand exceptions instantly using AI.
```

The main form should display the currently selected provider/model in a subtle, non-intrusive way, for example:

```text
Using Ollama · qwen3:8b
```

or:

```text
Using Groq · <configured-model>
```

Add a Settings button/icon that opens the Preferences experience.

Do not turn the application into a tab-based UI.

### 10. Future-ready analysis features

Preserve and implement the features already specified in the attached future-ready implementation document:

1. Log Analysis
2. API Error Analysis
3. Playwright Failure Analysis
4. Selenium Failure Analysis
5. SQL Analysis
6. File Upload
7. PDF Upload
8. Multi-Model Comparison

Do not remove the existing classifier/analyzer architecture.

### 11. Multi-model comparison

The existing plan allows comparison of up to 4 models.

Update this carefully for provider awareness.

For Ollama:

- comparison models must come only from locally installed Ollama models.

For Groq:

- do not invent a list of Groq models in the frontend.

If the existing Groq configuration exposes only one configured model, comparison should not pretend that multiple Groq models are available.

A comparison request must contain real available models/providers only.

If necessary, represent a comparison selection as:

```json
{
  "provider": "OLLAMA",
  "models": ["model-a", "model-b"]
}
```

or an equivalent provider-aware structure.

### 12. Preserve existing result structure

Keep the current 7 result fields:

```text
exceptionType
rootCause
technicalExplanation
fix
bestPractices
preventionTips
confidence
```

Continue using additive fields:

```text
analysisType
sections
```

Do not unnecessarily break `ResultCard`.

### 13. Error handling

Provide clear errors for:

- Ollama unavailable
- no local Ollama models
- selected Ollama model no longer installed
- Groq API key missing
- Groq API failure
- invalid provider
- invalid model
- model comparison failure
- file extraction failure
- oversized upload
- unsupported file type

Never leak:

- API keys
- Authorization headers
- secrets
- internal credentials

### 14. Testing

Add/update backend tests for:

- provider resolution
- Ollama model discovery
- Groq configuration validation
- provider-aware analysis
- missing Groq API key
- Ollama unavailable
- invalid Ollama model
- classifier routing
- JSON parsing
- comparison with partial failures

Verify manually:

1. Ollama selected + real installed models appear.
2. An Ollama model can be selected.
3. A model removed from Ollama disappears after refresh.
4. Ollama stopped → friendly unavailable state.
5. Groq selected → no secret is exposed in UI/network response.
6. Missing Groq key → clear configuration error.
7. Analysis works with both providers when configured.
8. Existing exception analysis still works.
9. Future-ready analyzers still work.
10. Compare mode never displays fake models.
11. `AI Engineering Experiment #1` is gone.

---

## C — Context

The current application is:

```text
Frontend: React
Backend: Spring Boot
Current local LLM integration: Ollama
Current UI: single-screen exception analyzer
```

The current home screen has:

- AI Exception Explainer heading
- input textarea
- model dropdown
- Analyze button
- Clear button
- backend connection indicator

The current implementation already has a future-ready design based on:

```text
Input
→ classify
→ analyzer
→ prompt
→ Ollama
→ structured JSON
→ render
```

The attached implementation specification expands this into:

- automatic input classification
- specialized analyzers
- file/PDF extraction
- multi-model comparison
- backend tests
- frontend comparison/file UI

Keep that architecture, but generalize the LLM layer so that it is no longer Ollama-specific.

The most important product change in this release is:

> **LLM provider and Ollama model configuration belongs in Preferences/Settings, while the main screen remains simple.**

A second critical requirement is:

> **Only models genuinely available on the local machine may appear when Ollama is selected.**

---

## E — Examples

### Example 1 — Ollama

Ollama currently has:

```text
qwen3:8b
bonsai:27b
```

Preferences should show:

```text
AI Provider

● Ollama
○ Groq

Available local models
[ qwen3:8b ▼ ]

[Refresh Models]
```

It must NOT show:

```text
deepseek-64k
llama3
qwen2.5-coder
```

unless those models actually exist in Ollama.

### Example 2 — Groq

`application.properties`:

```properties
groq.api-key=${GROQ_API_KEY:}
groq.model=<configured-model>
```

Preferences:

```text
AI Provider

○ Ollama
● Groq

Groq Status
✓ Configured

Model
<configured-model>

API key
••••••••
```

Preferably do not display even a masked key if it is unnecessary; a simple `Configured` status is safer.

### Example 3 — Main screen

```text
AI Exception Explainer

Understand exceptions instantly using AI.

Backend connected

Paste Exception / Stack Trace / Logs

[ textarea ]

Using Ollama · qwen3:8b                    [Settings]

                                      [Clear] [Analyze]
```

### Example 4 — Missing local models

```text
Ollama

⚠ Ollama is connected but no local models were found.

Pull a model in Ollama and click Refresh Models.
```

### Example 5 — Ollama unavailable

```text
Ollama

✕ Unable to connect to Ollama.

Make sure Ollama is running, then click Refresh Models.
```

---

## P — Parameters / Constraints

### Architecture

- Preserve existing working behavior.
- Prefer incremental refactoring over rewriting.
- Follow the existing project package and naming conventions.
- Keep Spring dependency injection clean.
- Avoid provider-specific logic in analyzer classes.
- Keep analyzer prompts independent from LLM provider.
- Keep structured JSON parsing provider-independent.
- Use reactive types consistently if the current backend uses WebFlux/Reactor.

### Security

- Groq API key is server-side only.
- Never put the key in React code.
- Never put the key in localStorage.
- Never return it from `/api/models`, preferences, health, or configuration endpoints.
- Never log it.
- Use environment variable substitution where possible.

### Model discovery

- Ollama models MUST come from the actual Ollama installation.
- No hardcoded placeholder model list.
- Do not assume a model exists because it appears in documentation.
- Do not show unavailable models in the selector.

### UI

- Preserve the existing visual language.
- Keep the main screen simple.
- No tabs/routes for analysis types.
- Settings may be a modal or dedicated Preferences view.
- Avoid unnecessary UI clutter.
- Remove `AI Engineering Experiment #1`.

### Compatibility

- Preserve existing analysis functionality.
- Preserve the 7-field result schema.
- Preserve the existing auto-detection behavior.
- Preserve file/PDF functionality.
- Preserve compare functionality while making it provider/model aware.

### Configuration

Use safe defaults.

Example:

```properties
ai.default-provider=ollama

ollama.base-url=http://localhost:11434

groq.base-url=https://api.groq.com/openai/v1
groq.api-key=${GROQ_API_KEY:}
groq.model=<configured-model>
```

Do not commit real credentials.

### Scope control

Do NOT:

- add authentication
- add a database
- add cloud model discovery unrelated to Groq
- add fake model entries
- expose secrets
- replace the entire frontend
- replace the existing analyzer architecture
- add tabs for Exception/SQL/API/Log/etc.
- add a frontend test framework unless already required by the existing project

---

## O — Output

Before coding:

1. Inspect the existing repository.
2. Identify the current Ollama client, analysis service, DTOs, controller, React state, API service, and model selector.
3. Compare the existing implementation with the attached future-ready specification.
4. Identify files that must be modified, created, renamed, or deleted.
5. State any conflicts between the current code and this specification.

Then implement the release.

After implementation provide:

### 1. Implementation summary

List the completed changes grouped by:

```text
Backend
Frontend
Configuration
Testing
Documentation
```

### 2. File change list

For every created/modified/deleted file:

```text
FILE
ACTION
PURPOSE
```

### 3. API changes

Document:

```text
GET /api/models
POST /api/analyze
POST /api/analyze/file
POST /api/analyze/compare
```

including request/response examples.

### 4. Configuration

Show the required `application.properties` entries using placeholders only.

### 5. Testing

Report:

```text
Tests added
Tests executed
Tests passed
Tests failed
Manual verification required
```

Do not claim a test passed unless it was actually executed.

### 6. Known limitations

Explicitly list anything that could not be verified or implemented.

---

## T — Tone

Be technical, precise, pragmatic, and implementation-focused.

Do not make assumptions silently.

Do not rewrite working code unnecessarily.

When something is ambiguous, inspect the repository and existing conventions first.

Prefer production-quality architecture over the shortest implementation.

The final implementation should feel like a real product release, not a prototype experiment.
