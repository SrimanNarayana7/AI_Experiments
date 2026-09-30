# AI Locator Generator — Implementation Plan

## 1. Goal

Build a production-style web application where a tester provides **raw HTML/DOM or a page URL**, selects a target automation framework/language, and receives **AI-generated, ranked, stable element locators** with explanations, fallback strategies, and Page Object code.

**Architecture:** React + Vite frontend → LangFlow API/backend → LLM → structured locator analysis → React results UI.

Keep the first version focused: reliable locator generation and a polished UX. Do not build a large crawler, database, authentication system, or complex agent framework in v1.

---

## 2. High-Level Architecture

```text
React + Vite UI
      |
      | REST/JSON
      v
LangFlow Backend
      |
      +--> Input validation / normalization
      |
      +--> DOM extraction/parsing
      |
      +--> Locator Analysis Prompt
      |
      +--> OpenAI / Anthropic Chat Model
      |
      +--> Structured JSON locator response
      |
      v
React Results Dashboard
```

### Main components

- **Frontend:** React, Vite, TypeScript, Tailwind CSS.
- **Backend/AI:** LangFlow flow exposed through API.
- **LLM:** OpenAI or Anthropic, configurable through environment variables.
- **DOM parsing:** Parse HTML before sending useful DOM context to the model.
- **Output contract:** Strict JSON from the LLM; frontend renders the JSON.
- **No database required for v1.**

---

## 3. LangFlow Flow

Create one primary flow named `AI Locator Analyzer`.

### Nodes

1. **Input / Chat Input**
   - `html`
   - `page_url` (optional)
   - `framework`: Selenium / Playwright / Cypress
   - `language`: Java / Python / JavaScript / TypeScript / C#
   - optional `focus_element`

2. **DOM Processor**
   - If raw HTML is supplied, normalize it.
   - Identify interactive elements: `button`, `input`, `textarea`, `select`, `a`, checkbox, radio, etc.
   - Preserve useful attributes: `id`, `name`, `class`, `role`, `aria-*`, `data-*`, `placeholder`, visible text, `type`.
   - Remove unnecessary scripts/styles/noise where possible.
   - Limit oversized input before LLM processing.

3. **Prompt Template**
   - Tell the model to behave as a senior QA automation locator engineer.
   - Evaluate multiple locator strategies.
   - Prefer semantic/accessibility and stable test attributes over brittle selectors.
   - Never invent attributes that do not exist in the supplied DOM.
   - Explain why a locator is selected.

4. **Chat Model**
   - Default temperature: `0.2`.
   - Model configurable through environment variables.
   - Use structured JSON output if supported.

5. **JSON Parser / Validation**
   - Validate the LLM response against the expected schema.
   - Reject/repair malformed responses rather than returning arbitrary Markdown.

6. **Output**
   - Return structured locator analysis to the frontend.

---

## 4. Locator Scoring Model

For every interactive element, generate candidate strategies and score them using a simple weighted model:

| Criterion | Weight |
|---|---:|
| Uniqueness | 25% |
| Stability / change resilience | 30% |
| Readability | 15% |
| Specificity | 15% |
| Framework suitability / performance | 15% |

Use a `0-100` stability score.

### Preferred strategy order

Generally prefer:

1. Stable `data-testid` / dedicated test attributes
2. Accessible role + accessible name
3. Stable `id`
4. Stable `name`
5. Stable semantic attributes
6. CSS selector using stable attributes
7. XPath only when necessary

The model must **not blindly follow this order**. It should evaluate the actual DOM and explain exceptions.

---

## 5. Required Output Schema

Return JSON similar to:

```json
{
  "summary": {
    "elementsAnalyzed": 12,
    "highConfidence": 9,
    "warnings": []
  },
  "elements": [
    {
      "element": "Login button",
      "tag": "button",
      "primary": {
        "strategy": "role",
        "locator": "getByRole('button', { name: 'Login' })",
        "score": 94,
        "reason": "Uses the accessible role and stable visible name."
      },
      "fallbacks": [
        {
          "strategy": "data-testid",
          "locator": "[data-testid='login-button']",
          "score": 91
        }
      ],
      "risks": [],
      "pageObject": {
        "field": "loginButton",
        "code": "..."
      }
    }
  ]
}
```

The backend must return data, not presentation-specific Markdown.

---

## 6. Frontend UX

Build a **production-looking lightweight dashboard**, not a tutorial UI.

### Layout

```text
┌──────────────────────────────────────────────────────┐
│ Logo / AI Locator Generator       Framework  Language │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Input DOM / URL                    Analysis Summary │
│  ┌───────────────────────────┐     ┌──────────────┐ │
│  │ Paste HTML / DOM...       │     │ 24 Elements  │ │
│  │                           │     │ 18 Stable    │ │
│  └───────────────────────────┘     │ Avg 91/100   │ │
│  [Analyze Locators]                └──────────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Locator Recommendations                              │
│                                                      │
│ Element | Strategy | Locator | Score | Risk         │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Selected Element                                     │
│ Primary locator / alternatives / explanation / code  │
└──────────────────────────────────────────────────────┘
```

### UI requirements

- Modern dark/light neutral palette with one strong accent color.
- Strong typography and spacing.
- Cards with subtle borders, not excessive gradients.
- Clear score badges and risk indicators.
- Monaco/code-style blocks for locators and Page Object code.
- Copy buttons for every locator/code block.
- Search/filter elements.
- Framework/language selectors.
- Loading state with analysis progress.
- Empty state and useful validation errors.
- Responsive desktop-first layout.
- Avoid excessive animations.

### Main screens/states

1. **Analyzer screen** — input + configuration.
2. **Results screen** — element list + scores.
3. **Element detail drawer/panel** — reasoning, alternatives, code.

No routing complexity is required initially; one polished application is enough.

---

## 7. Framework Generation

### Selenium
Generate framework-native locators such as:

```java
By.id("login");
By.cssSelector("[data-testid='login-button']");
By.xpath("//button[normalize-space()='Login']");
```

Include an optional recommended wait strategy, but do not generate unnecessary sleeps.

### Playwright
Prefer:

```ts
page.getByRole('button', { name: 'Login' });
page.getByTestId('login-button');
page.locator("[name='email']");
```

### Cypress
Generate:

```js
cy.get('[data-testid="login-button"]');
cy.contains('button', 'Login');
```

The LLM must only generate selectors supported by the selected framework and language.

---

## 8. API Contract

Expose one frontend-facing endpoint through the LangFlow backend integration:

`POST /api/analyze`

Request:

```json
{
  "html": "<html>...</html>",
  "pageUrl": "",
  "framework": "playwright",
  "language": "typescript"
}
```

Response:

```json
{
  "success": true,
  "analysis": { "...": "structured locator result" }
}
```

For v1, the React app can call the LangFlow run endpoint through a small backend adapter/proxy if required. Keep LLM API keys server-side; **never expose provider keys in React/Vite environment variables**.

---

## 9. URL Support

Treat URL analysis as a second input mode.

### V1 behavior
- Raw HTML/DOM is the primary supported mode.
- URL mode should fetch page HTML only where technically/safely supported.
- Do not attempt complex authenticated browser automation in v1.
- For JavaScript-rendered pages, clearly indicate when static HTML is insufficient.

Chrome DevTools/live inspection can be added later as a separate integration; it is not required for the first implementation.

---

## 10. Error Handling

Handle:

- Empty HTML.
- Invalid HTML.
- Extremely large DOM.
- LLM timeout.
- LLM rate limit/API error.
- Invalid LLM JSON.
- Unsupported framework/language combination.
- No interactive elements found.

Return actionable errors to the UI.

---

## 11. Project Structure

```text
ai-locator-generator/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalyzerInput.tsx
│   │   │   ├── ConfigurationBar.tsx
│   │   │   ├── LocatorTable.tsx
│   │   │   ├── LocatorDetails.tsx
│   │   │   ├── ScoreBadge.tsx
│   │   │   └── CodeBlock.tsx
│   │   ├── pages/
│   │   ├── services/api.ts
│   │   ├── types/locator.ts
│   │   └── App.tsx
│   └── ...
│
├── langflow/
│   ├── flows/
│   │   └── ai_locator_analyzer.json
│   ├── prompts/
│   │   └── locator_analysis.md
│   └── README.md
│
└── README.md
```

Adjust this structure to the existing repository if one already exists; do not duplicate framework infrastructure unnecessarily.

---

## 12. Implementation Order

### Phase 1 — Working AI pipeline
- Create LangFlow flow.
- Accept HTML + framework + language.
- Normalize/extract interactive DOM.
- Implement prompt.
- Generate structured locator JSON.
- Validate output.

### Phase 2 — React production UI
- Create Vite + React + TypeScript app.
- Build polished analyzer page.
- Connect API.
- Render locator table and detail panel.
- Add copy-to-clipboard and filtering.

### Phase 3 — Automation output
- Add Selenium, Playwright and Cypress generation.
- Add Java/Python/JS/TS/C# where applicable.
- Generate Page Object snippets.
- Add fallback locators and wait recommendations.

### Phase 4 — Hardening
- Input limits and validation.
- LLM failure handling.
- JSON/schema validation.
- Responsive UI.
- Test representative DOM samples.
- Add README and `.env.example`.

---

## 13. Acceptance Criteria

The implementation is complete when:

- A tester can paste a real HTML snippet and click **Analyze Locators**.
- The system identifies interactive elements automatically.
- Each element receives a primary locator plus fallbacks where useful.
- Every locator has a stability score and explanation.
- Locators are generated according to the selected framework/language.
- Page Object code is generated for the selected stack.
- The UI clearly highlights high-risk/brittle selectors.
- The system never invents DOM attributes.
- Invalid/failed LLM output does not break the UI.
- API keys remain server-side.
- The application looks like a small production tool rather than a learning/demo project.

---

## 14. Important Agent Rules

- **Do not overengineer v1.** No database, authentication, Redis, queues, microservices, or vector DB.
- Keep LangFlow responsible for AI orchestration; React is responsible for presentation.
- Prefer structured JSON over Markdown between backend and frontend.
- Make the LLM output deterministic and schema-driven.
- Never fabricate selectors or DOM attributes.
- Prefer semantic/accessibility/test attributes and explicitly explain brittle XPath/CSS when unavoidable.
- Keep components reusable and typed.
- Keep secrets out of the frontend.
- Make the first end-to-end flow work before adding URL/DevTools enhancements.
