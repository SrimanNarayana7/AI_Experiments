# AI Exception Explainer — Implement Future Ready Features

## Goal

Implement all 8 features from the "Future Ready" section of `prompt/Exception_Explainer.md`, plus a provider/model configuration release:

1. **Log Analysis**
2. **API Error Analysis**
3. **Playwright Failure Analysis**
4. **Selenium Failure Analysis**
5. **SQL Analysis**
6. **File Upload** (text formats)
7. **PDF Upload** (PDF text extraction)
8. **Multi-Model Comparison**
9. **LLM Provider Selection (Ollama / Groq)**
10. **Preferences-based model configuration and real Ollama model discovery**

**UI decision (user-approved):** no tabs/routes for analysis types — the backend **auto-detects** the input type from a single textarea. The frontend keeps one primary analysis form, adds a file drop zone and compare-mode support. Provider/model configuration moves out of the main form into a Preferences/Settings page or modal.

**Critical UI decision:** remove the `AI Engineering Experiment #1` label from the home screen. Do not replace it with another experiment/version label.

## Design Overview

Every feature shares the same pipeline — *input → classify → prompt → LLM provider → structured JSON → render*. The analyzer layer must not depend on Ollama directly.

- **`InputClassifier`** — heuristic detection of `AnalysisType` from raw text.
- **`Analyzer` strategy** — one implementation per `AnalysisType`, each providing a persona-specific prompt + shared JSON parsing.
- **Generalized result** — the existing 7-field response is preserved (`exceptionType`, `rootCause`, `technicalExplanation`, `fix`, `bestPractices`, `preventionTips`, `confidence`) and **extended additively** with `analysisType` + optional `sections`. This keeps `ResultCard` rendering mostly unchanged and the existing request body `{ exception, model }` identical.
- **File/PDF upload** — new multipart endpoint feeding the same classifier+analyzer pipeline.
- **Multi-model comparison** — new endpoint running the same input across N real, available models.
- **LLM provider abstraction** — `Ollama` and `Groq` clients behind a common interface.
- **Model discovery** — Ollama models are fetched from the actual local Ollama installation; no hardcoded model placeholders are allowed.
- **Preferences** — provider and model preferences are configured outside the main analysis form.

## Backend Changes

All paths under `backend/src/main/java/com/aiexception/explainer/`.

### 1. Domain — generalize the result

- **Rename** `domain/ExceptionAnalysis.java` → `domain/Analysis.java` and add fields:
  ```java
  public record Analysis(
      String analysisType,               // NEW: "EXCEPTION" | "LOG" | "API_ERROR" | "SQL" | "PLAYWRIGHT" | "SELENIUM"
      String exceptionType,              // unchanged — serves as the title
      String rootCause,
      String technicalExplanation,
      String fix,
      List<String> bestPractices,
      List<String> preventionTips,
      List<AnalysisSection> sections,    // NEW: optional type-specific sections
      Confidence confidence
  ) {}
  ```
- **New** `domain/AnalysisType.java` — enum `EXCEPTION, LOG, API_ERROR, SQL, PLAYWRIGHT, SELENIUM` (with a `label()` for UI).
- **New** `domain/AnalysisSection.java` + `domain/SectionKind.java`:
  ```java
  public record AnalysisSection(String title, String content, List<String> items, SectionKind kind) {}
  public enum SectionKind { TEXT, CODE, LIST }
  ```

### 2. Shared JSON parsing — extract from `AnalysisService`

- **New** `service/JsonResponseParser.java` (`@Component`, stateless): move `extractJson`, `textOr`, `listOr`, `parseConfidence` out of `AnalysisService` (lines 126–168), plus new `parseSections(JsonNode)` reading `sections` array `{title, content, items, kind}` — tolerant of missing fields (defaults: TEXT kind, empty lists), exactly like the existing lenient pattern.

### 3. Analyzer strategy layer — new package `service/analyzer/`

- **New** `Analyzer.java` interface:
  ```java
  public interface Analyzer {
      AnalysisType type();
      String buildPrompt(String input);
      Analysis parse(JsonNode node);          // uses JsonResponseParser
  }
  ```
- **New** `BaseAnalyzer.java` — `abstract class BaseAnalyzer implements Analyzer` holding the shared prompt skeleton (JSON-only instruction, 7-key schema + optional `sections`, persona + guidance injected per subclass) and the parse flow (sets `analysisType` from `type()`, leaves `sections` empty by default).
- **New implementations** (each = `@Component`, own persona in `buildPrompt`, only override `sections` parsing when needed):
  - `ExceptionAnalyzer` — the current `AnalysisService.buildPrompt` verbatim (now routed through BaseAnalyzer).
  - `LogAnalyzer` — persona: app logs, log levels, observability. Guidance on timestamps, ERROR/WARN clusters, stack-trace dumps within logs.
  - `ApiErrorAnalyzer` — persona: REST/HTTP. Guidance on status codes, headers, retries, idempotency, client vs server errors.
  - `SqlAnalyzer` — persona: SQL dialects (MySQL/PostgreSQL/SQL Server/Oracle). Guidance on syntax vs runtime errors, query plans, indexes.
  - `PlaywrightAnalyzer` — persona: Playwright automation. Guidance on locators, `page.*` failures, timeouts, `expect` assertions, network errors.
  - `SeleniumAnalyzer` — persona: Selenium WebDriver. Guidance on element interaction, waits, driver/session errors.
- **New** `AnalyzerRegistry.java` — `@Component`; constructor-injects `Map<AnalysisType, Analyzer>` (Spring auto-wires all `Analyzer` beans into the map by `type()`); `forType(AnalysisType)` throws `IllegalArgumentException` if missing.

### 4. Input classifier — new package `service/classifier/`

- **New** `InputClassifier.java` interface: `AnalysisType classify(String input);`
- **New** `HeuristicInputClassifier.java` — `@Component`. Precedence (first match wins):
  1. **SQL** — `ORA-\d{5}`, `SQLSTATE`, `java.sql.SQLException`, `com.mysql.cj`, `org.postgresql`, syntax-error + dialect keywords, `SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP` near `FROM|INTO|SET|TABLE|WHERE`.
  2. **PLAYWRIGHT** — `playwright`, `page\.(locator|click|fill|goto|waitFor|expect)`, `TimeoutError`, `net::ERR_`, `expect(...).toHave`.
  3. **SELENIUM** — `org.openqa.selenium`, `WebDriverException`, `NoSuchElementException`, `ElementNotInteractableException`, `StaleElementReferenceException`, `SessionNotCreatedException`, `chromedriver|geckodriver`.
  4. **API_ERROR** — `HTTP/1.1 [45]\d\d`, `HttpClientErrorException|HttpServerErrorException|RestClientException`, `curl:`, `statusCode|status code` near `4\d\d|5\d\d`, `ApiException`.
  5. **LOG** — timestamp AND level (`\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}.*\b(INFO|WARN|ERROR|DEBUG|TRACE)\b` etc.) **and no `\bat\s+\S+\s+\(.*\.java:\d+\)` stack-frame lines** (so log4j-dumped stack traces stay EXCEPTION).
  6. **Default: EXCEPTION** — preserves current behavior.
- **New** `UnsupportedInputException`? Not needed — every input classifies; only unknown file types are rejected.

### 5. Refactor `AnalysisService`

- Inject `InputClassifier` + `AnalyzerRegistry` + `JsonResponseParser`.
- `analyze(String input, LlmProvider provider, String requestedModel)`:
  ```java
  AnalysisType type = classifier.classify(input);
  Analyzer analyzer = registry.forType(type);
  String prompt = analyzer.buildPrompt(input);
  LlmGenerateRequest request = requestFactory.create(provider, requestedModel, prompt);
  return llmClientRegistry.forProvider(provider).generate(request)
      .onErrorMap(this::mapLlmError)
      .map(raw -> analyzer.parse(parser.extractJson(raw)));
  ```
- Keep the classifier/analyzer/parser responsibilities separate from provider transport.
- Replace Ollama-specific resolution in the analysis path with provider-aware validation/resolution.
- Keep provider-specific error mapping friendly and safe; never expose API keys or authorization headers.
- Existing `OllamaGenerateRequest`/`OllamaGenerateResponse` may remain as internal transport DTOs if useful, but they must sit behind the provider abstraction.

### 6. LLM Provider + Model Discovery — new package `service/llm/`

Introduce a provider abstraction so analyzers do not depend directly on Ollama.

- New `domain/LlmProvider.java` — enum `OLLAMA, GROQ`.
- New `service/llm/LlmClient.java`:
  ```java
  public interface LlmClient {
      Mono<String> generate(LlmGenerateRequest request);
  }
  ```
- New `service/llm/OllamaLlmClient.java` — wraps the existing Ollama integration.
- New `service/llm/GroqLlmClient.java` — calls Groq using the server-side API key.
- New `service/llm/LlmClientRegistry.java` — resolves a client by `LlmProvider`.
- New `service/llm/OllamaModelService.java` — calls Ollama `/api/tags` and returns only models actually installed locally.
- Add safe model-discovery DTOs containing at minimum `provider`, `models`, `available`, and a safe `message` when needed.

Security:
- `groq.api-key` is backend-only.
- Never return the key to the frontend.
- Never log the key.
- Never persist the key in browser storage.
- Never hardcode model placeholders.

### 6. New endpoints — `controller/AnalysisController.java`

- **`GET /api/models`** — returns real models available from the local Ollama installation. No fake or hardcoded frontend model list. If Ollama is unavailable, return an empty model list plus safe availability/message fields.
- **`POST /api/analyze`** — auto-detects input type. Extend the request additively to support `provider` and `model`; preserve compatibility with the existing `{ exception, model }` shape where practical. `AnalyzeResponse` keeps the additive `analysisType` and `sections` fields.
- **`POST /api/analyze/file`** (multipart) — accepts provider/model configuration and feeds extracted text into the same pipeline.
- **`POST /api/analyze/compare`** — provider-aware comparison request. Ollama comparisons must use real locally installed models. Groq comparisons must use only configured/validated models; never fabricate a model catalog.
- **Preferences are frontend configuration, not secret storage:** provider and selected Ollama model may be stored locally in browser preferences; Groq credentials must never be stored there.
- **CompareRequest**:
  ```java
  public record CompareRequest(
      @NotBlank String exception,
      @NotEmpty @Size(max = 4) List<@NotBlank String> models
  ) {}
  ```
  Service method `compare(String input, List<String> models)`: `Flux.fromIterable(models).flatMap(m -> analyze(input, m).map(a -> new ModelAnalysisResult(m, a, null)).onErrorResume(e -> Mono.just(new ModelAnalysisResult(m, null, e.getMessage()))), models.size())` → `collectList()` → `CompareResponse(List<ModelAnalysisResult> results)`. Per-model errors become `error` fields — partial results, whole request never fails on one model.
- **New** DTOs in `controller/dto/`: `CompareRequest.java`, `CompareResponse.java`, `ModelAnalysisResult.java`.

### 7. File & PDF extraction — new package `service/extraction/`

- **New** `FileContentExtractor.java` interface: `String extract(MultipartFile file);` (throws `FileExtractionException`).
- **New** `TextFileExtractor.java` — reads UTF-8, caps at 20000 chars (matches `AnalyzeRequest` size limit), rejects null-byte/binary content.
- **New** `PdfFileExtractor.java` — Apache PDFBox `PDDocument.load` + `PDFTextStripper`; empty extraction → `FileExtractionException`.
- **New** `FileExtractionService.java` — validates extension against `app.allowed-file-extensions` (default `.txt .log .json .md .csv .sql .java .py .js .ts .html .xml .yml .yaml .properties .pdf`), dispatches `.pdf` → PDF extractor, everything else → text extractor. Throws `UnsupportedFileTypeException` for unknown extensions.

### 8. Exceptions + handler — `controller/GlobalExceptionHandler.java`

New exceptions extend the existing `AiAnalysisException` base:
- `service/UnsupportedFileTypeException` → **400**
- `service/FileExtractionException` → **422**
- `service/CompareRequestException` (models > max) → **400** (defensive — bean validation should catch it first)
- Add handler for `MaxUploadSizeExceededException` → **413**

### 9. Config — `resources/application.properties` + `pom.xml`

```properties
app.max-compare-models=4
app.allowed-file-extensions=.txt,.log,.json,.md,.csv,.sql,.java,.py,.js,.ts,.html,.xml,.yml,.yaml,.properties,.pdf
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=6MB
```
New dependency in `pom.xml`: `org.apache.pdfbox:pdfbox:2.0.31`.

### 10. Backend tests — new `backend/src/test/java/com/aiexception/explainer/`

- `service/classifier/HeuristicInputClassifierTest` — one realistic sample per category + tricky cases (log4j-dumped stack trace → EXCEPTION, Spring `HttpClientErrorException` → API_ERROR).
- `service/JsonResponseParserTest` — fence stripping, brace-slicing, malformed JSON, confidence fallback, sections parsing, missing fields.
- `service/AnalysisServiceTest` — Mockito-mocked `OllamaClient`: model resolution, `onErrorMap` → `OllamaUnavailableException`, classifier→analyzer routing, compare partial-error handling.
- `controller/AnalysisControllerTest` — `@WebFluxTest`/`@SpringBootTest` + `@MockBean OllamaClient`: happy path for all three endpoints, multipart file happy path (mocked extractor), validation errors.

## Frontend Changes

All paths under `frontend/src/`.

### 11. `services/api.js` — shared request helper + 3 functions

- Extract a `request(path, options)` helper containing the existing error handling (`body.message` extraction, fallback message).
- `analyzeText(text, model)` — POST `/analyze`, `{ exception: text, model }` (was `analyzeException`; keep name `analyzeException` and add aliases to minimize churn — plan: rename to `analyzeText`, update `App.jsx`).
- `analyzeFile(file, model)` — POST `/analyze/file` with `FormData` (no `Content-Type` header — browser sets the multipart boundary).
- `compareModels(text, models)` — POST `/analyze/compare`, `{ exception: text, models }`.
- `checkBackendHealth()` — unchanged.

### 12. `App.jsx` — new state + branching

- New state: `file` (File | null), `compareMode` (bool), `selectedModels` (array, default `[]`), plus provider/model preferences loaded from Settings.
- Do not reintroduce a primary model dropdown into the main form. The default provider/model comes from Preferences.
- Comparison choices must come from real available/configured models; never from a hardcoded placeholder list.
- `handleAnalyze()` branches:
  1. Validate: text OR file must be present.
  2. `compareMode && selectedModels.length > 1` → `compareModels(text, selectedModels)` → `setCompareResults(data.results)`.
  3. `file` → `analyzeFile(file, model)` → `setResult(data)`.
  4. else → `analyzeText(text, model)` → `setResult(data)`.
- New state `compareResults` (array | null); render `<CompareResults>` when set, else single `<ResultCard>`.
- `handleClear()` resets file + compareResults too.

### 13. `components/AnalyzerForm.jsx` — file input + compare mode

- **File drop zone**: `<input type="file" accept=".txt,.log,.json,.md,.csv,.sql,.java,.py,.js,.ts,.html,.xml,.yml,.yaml,.properties,.pdf">` styled as a dashed drop area (new `FileDropZone.jsx`/`.css` following the `.jsx`+`.css` co-location convention), with drag-over highlight, selected-file name display, and remove button. Disabled while loading.
- **Compare mode**: keep the existing compare capability, but do not restore a hardcoded model selector. Comparison choices must come from the real provider model catalog/configuration. If comparison models are configured in Preferences, show only those choices.
- Add a Settings entry point to the form/page; provider and default model are managed there.
- Update label hint: "Paste Exception / Stack Trace / Log / SQL / API Error — type is auto-detected".

### 15. `components/Settings.jsx` / `components/SettingsModal.jsx` + styles

- Add a Preferences/Settings page or modal matching the existing dark/purple theme.
- Provider selector: `Ollama` or `Groq`.
- For Ollama:
  - show connection status;
  - fetch real local models from `GET /api/models`;
  - allow default model selection;
  - provide `Refresh Models`;
  - show useful empty/unavailable states.
- For Groq:
  - show safe configuration status only;
  - do not show or accept the API key in the browser;
  - show the server-configured model if available.
- Persist only non-secret preferences such as provider and selected Ollama model.
- Save/close behavior must update the main screen's compact provider/model indicator.

### 16. `components/ResultCard.jsx` — new fields

- Add an `analysisType` chip next to the confidence badge (lookup map `EXCEPTION→"Exception"`, `LOG→"Log"`, `API_ERROR→"API Error"`, `SQL→"SQL"`, `PLAYWRIGHT→"Playwright"`, `SELENIUM→"Selenium"`, fallback hidden).
- After the 7 base sections, render `result.sections` (when present): `kind TEXT` → `ResultSection` with `<p>`, `CODE` → `ResultSection` with `<pre className="code-block">`, `LIST` → existing `ListSection` with `items`.
- Everything else unchanged — the 7 existing field names are preserved.

### 15. New `components/CompareResults.jsx` + `.css`

- Header "Model Comparison", grid `.compare-grid` of `<ResultCard>`s (one per model, each already takes `model` prop), responsive columns. A model with an `error` field renders a compact error card instead.

### 18. Frontend tests

None currently (no test framework). Keep scope: backend unit tests cover the risky logic (classifier/parser); verify UI manually per the checklist below. Optionally note vitest as future work — do not add now.

## Implementation Order (each step keeps the app runnable)

1. **Domain + parser + analyzer layer** — `Analysis`, `AnalysisType`, `AnalysisSection`, `SectionKind`, `JsonResponseParser`, `Analyzer`, `BaseAnalyzer`, `ExceptionAnalyzer`, `AnalyzerRegistry`; refactor `AnalysisService` + controller mapping. App behaves exactly as before (classifier defaults to EXCEPTION).
2. **Classifier** — `InputClassifier` + `HeuristicInputClassifier` + unit tests (routes everything to EXCEPTION until step 3 lands).
3. **Remaining analyzers** — `LogAnalyzer`, `ApiErrorAnalyzer`, `SqlAnalyzer`, `PlaywrightAnalyzer`, `SeleniumAnalyzer` + parser/classifier tests.
4. **File/PDF upload** — extractors, `FileExtractionService`, multipart endpoint, exceptions + handler, PDFBox dep, config.
5. **LLM provider layer** — `LlmProvider`, `LlmClient`, Ollama/Groq clients, registry, configuration, model discovery endpoint, provider-aware errors.
6. **Multi-model compare** — provider-aware `CompareRequest/Response`, `compare()` service method, endpoint, handler entries.
7. **Frontend** — `api.js` refactor, Settings/Preferences, provider/model state, `App.jsx` state/branching, `FileDropZone`, compare UI, `ResultCard` sections + type chip, `CompareResults`.
8. **Docs + E2E** — update `README.md`, `api.md`, `architecture.md`; run verification.

## Files to Modify / Create (summary)

**Backend — modify:** `domain/ExceptionAnalysis.java` (→ `Analysis.java` rename), `service/AnalysisService.java`, `controller/AnalysisController.java`, `controller/dto/AnalyzeResponse.java`, `controller/GlobalExceptionHandler.java`, `resources/application.properties`, `pom.xml`.

**Backend — create:** `domain/{AnalysisType,AnalysisSection,SectionKind,LlmProvider}.java`, `service/JsonResponseParser.java`, `service/analyzer/{Analyzer,BaseAnalyzer,AnalyzerRegistry,ExceptionAnalyzer,LogAnalyzer,ApiErrorAnalyzer,SqlAnalyzer,PlaywrightAnalyzer,SeleniumAnalyzer}.java`, `service/classifier/{InputClassifier,HeuristicInputClassifier}.java`, `service/extraction/{FileContentExtractor,TextFileExtractor,PdfFileExtractor,FileExtractionService}.java`, `service/{UnsupportedFileTypeException,FileExtractionException,CompareRequestException}.java`, `controller/dto/{CompareRequest,CompareResponse,ModelAnalysisResult}.java`, `src/test/java/com/aiexception/explainer/...` tests.

**Frontend — modify:** `src/services/api.js`, `src/App.jsx`, `src/components/AnalyzerForm.jsx`, `src/components/ResultCard.jsx`.

**Frontend — create:** `src/components/FileDropZone.jsx` + `.css`, `src/components/CompareResults.jsx` + `.css`, `src/components/Settings.jsx` or `SettingsModal.jsx` + `.css`.

**Docs:** `README.md`, `api.md`, `architecture.md`.

## Verification

1. `cd backend && mvn clean install` — compiles + runs all new unit/integration tests.
2. Restart backend (`mvn spring-boot:run`, currently running on 8080 — stop and restart after changes), keep frontend (`npm run dev`, port 5173, HMR picks up changes).
3. **Manual E2E per category** (paste → Analyze → expect correct `analysisType` chip + sensible analysis):
   - Exception: `java.lang.NullPointerException ... at com.example.Main.main(Main.java:5)`
   - SQL: `org.postgresql.util.PSQLException: ERROR: syntax error at or near "FROM"...`
   - API: `HttpClientErrorException$Unauthorized: 401 Unauthorized: [no body]`
   - Playwright: `TimeoutError: page.locator('#login').click() ... net::ERR_CONNECTION_REFUSED`
   - Selenium: `ElementNotInteractableException: element not interactable ... org.openqa.selenium...`
   - Log: `2026-08-09 03:45:12 ERROR c.a.e.OrderService - Failed to charge card: timeout`
4. **File upload:** upload a `.txt` log file and a `.pdf` → analysis returns; upload `.exe` → friendly 400 error; file > 5MB → 413 message.
5. **Preferences / Ollama:** open Settings, verify only models actually installed in local Ollama appear; change the local model inventory and Refresh to verify the list changes.
6. **Groq:** select Groq in Settings; verify no API key is exposed in the browser, and missing-key/configuration errors are friendly.
7. **Compare:** enable compare mode and use only real available/configured models; Analyze → grid with correct provider/model names. Never use placeholder model names.
8. Verify error paths still friendly: stop Ollama → unavailable message; backend stopped → frontend "Backend offline".

## Release Update — Provider & Preferences (supersedes conflicting older bullets)

The following requirements are mandatory for this revision and take precedence over any earlier statement in this document that conflicts with them:

1. Remove `AI Engineering Experiment #1` from the UI.
2. Support two providers: `OLLAMA` and `GROQ`.
3. Provider selection belongs in Preferences/Settings, not the main analysis form.
4. When Ollama is selected, the model selector must contain only models actually installed on the local Ollama instance.
5. The backend must discover Ollama models dynamically from `/api/tags` (or the appropriate Ollama model-list endpoint).
6. Never hardcode placeholder models in the frontend.
7. Groq API credentials remain in `application.properties` / environment-backed configuration and are never exposed to the frontend.
8. The provider/model layer must be abstracted so `AnalysisService` and analyzers are provider-independent.
9. The main screen may show a compact read-only indicator such as `Using Ollama · qwen3:8b`, but model changes happen in Settings.
10. Multi-model comparison must use only real available/configured models; it must not resurrect the old hardcoded example list.

## Assumptions & Decisions

- **Auto-detect** (user-approved) replaces any tab/route UI; classifier precedence documented in step 4. Misclassification risk is bounded by heuristics + tests; the 7-field schema means even a misclassified input still yields a useful analysis.
- **Response shape stays additive** (`analysisType`, `sections`) rather than a breaking rename — preserves `ResultCard`, README examples, and the api contract while enabling per-type extras.
- **`AnalyzeRequest.exception` field name kept** — request contract unchanged.
- **Compare capped at 4 models** (`app.max-compare-models`), partial results on per-model failure.
- **PDF only** for binary; other binaries rejected (no OCR — out of scope).
- **Model list is not hardcoded in the frontend.** Ollama models are fetched dynamically from the actual local Ollama installation.
- **Provider/model selection belongs in Preferences.** The main analysis form does not contain the primary model dropdown.
- **Groq credentials remain server-side.** The frontend receives only safe provider/configuration status and the configured model name when needed.
- No frontend test framework added (none exists); risky logic is covered by backend unit tests.
