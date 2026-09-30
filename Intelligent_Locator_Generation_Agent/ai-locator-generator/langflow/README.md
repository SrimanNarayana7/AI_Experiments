# LangFlow — AI Locator Analyzer

LangFlow Desktop deployment of the locator generation pipeline, same hosting pattern as API-Code-Generator-Agent: LangFlow Desktop runs the AI orchestration locally, the Node backend in `../backend` calls its run endpoint and validates the structured JSON output.

## Files

- `flows/ai_locator_analyzer.json` — importable flow (Chat Input → DOM Processor → Locator Analysis Prompt → Chat Model → JSON Parser → Chat Output), matching the node list in the approved `plan.md`
- `prompts/locator_analysis.md` — reference prompt (embedded in the flow's Prompt Template node)

## Import into LangFlow Desktop

1. Install and start LangFlow Desktop 1.11.x. It serves `http://localhost:7860`.
2. Open **New Project → Import** and select `flows/ai_locator_analyzer.json`.
3. Open the **AI Locator Analyzer** node and pick your model (ships as OpenAI-compatible `deepseek-chat`). Set your provider API key in LangFlow global variables or the node's `API Key` field.
4. Click the flow name and copy the **flow id** from the URL.
5. Set the backend environment:

```env
LLM_PROVIDER=langflow
LANGFLOW_BASE_URL=http://localhost:7860
LANGFLOW_FLOW_ID=<flow id from the URL>
LANGFLOW_API_KEY=      # only if you enabled LangFlow API key auth
```

6. Restart the backend and analyze as usual. The backend health badge shows `API · langflow`.

## How it works

The flow implements the approved `plan.md` node list:

1. **Chat Input** — receives the payload from the backend or the Playground.
2. **DOM Processor** (custom Python component) — accepts the backend's JSON envelope (`elementList`, `framework`, `language`, `warnings`, `sourceNote`) or raw HTML/DOM, extracts interactive elements (`button`, `input`, `a`, …), keeps stable attributes (`id`, `name`, `role`, `aria-*`, `data-*`, placeholder, text), strips scripts/styles, and limits oversized input.
3. **Locator Analysis Prompt** — injects the payload into the senior QA locator-engineer prompt with the scoring model and strategy order from `prompts/locator_analysis.md`.
4. **Chat Model** — OpenAI-compatible `deepseek-chat` by default, temperature `0.2`, max tokens `5000`; swap to any model LangFlow supports.
5. **JSON Response Parser** (custom Python component) — extracts the JSON from the LLM reply (handles Markdown fences), repairs it (`json_repair`), and returns a plain JSON message instead of Markdown.
6. **Chat Output** — returns the structured locator analysis.

- The backend sends a JSON envelope as the run `input_value`: `{framework, language, elementList, warnings, sourceNote}`. The DOM Processor reads it directly (LangFlow tweaks drop edge-connected inputs, so no tweaks are used). Everything else (validation, extraction, schema checks) stays deterministic on the backend side.
- It POSTs to `POST /api/v1/run/{flowId}?stream=false` and reads the structured result back.

## Notes

- The Chat Model node defaults to OpenAI-compatible `deepseek-chat`; swap to any model LangFlow supports (OpenAI-compatible, Anthropic, local Ollama).
- LangFlow API keys and provider keys stay server-side / in LangFlow Desktop — never in frontend environment variables.
