# Resume Tailor UI — React/Vite app for JD + master resume tailoring

## Goal

Personal, lightweight web app. Paste a job description + master resume, get the same
output the `resume-tailor` skill produces: fit-gap match table, a tailored resume spec,
a highlighted preview, and a downloadable `.docx` — without invoking a Claude skill.

## Decisions (locked from clarifying questions)

- **LLM**: OpenAI-compatible `chat/completions` endpoint (base URL + API key + model).
  User points at OpenAI, Groq, LM Studio, or local Ollama (`http://localhost:11434/v1`).
- **Output**: Preview + JSON export + `.docx` (working + clean copies).
- **Workflow**: full 6-step gate flow — analyze/match table first, then generate.

## Location

New directory `chapter_04_JobKitAI/resume-tailor-app/` (sibling of `resume-helper/` and
`output/`). Repo already ships chapter_05 (React 18 + Vite + Tailwind 3 + lucide-react)
which is the pattern to clone.

## Architecture

```
chapter_04_JobKitAI/resume-tailor-app/
├── package.json          # frontend deps + express/docx + concurrently
├── vite.config.js        # proxy /api -> localhost:8787
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx           # 3-step UI: Input -> Match table -> Resume
│   ├── api.js            # fetch wrappers for /api endpoints
│   ├── preview.jsx       # renders inline markup (==[x]==, [x], **x**) as styled spans
│   └── styles.css        # Tailwind base + shared .input/.button classes (clone ch05)
└── server/
    ├── index.js          # Express app, port 8787
    ├── llm.js            # OpenAI-compatible chat/completions client
    ├── prompts.js        # system + user prompts ported from SKILL.md + references
    └── render_resume.js  # port of build_resume.js logic (docx)
```

One `package.json` at root. `dev` runs Express + Vite together via `concurrently`.

## Backend endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/analyze` | `{ resume, jd, config }` | match table, requirements, fit estimate, absent list |
| POST | `/api/generate` | `{ resume, jd, analysis, config }` | resume JSON spec (inline markup intact) |
| POST | `/api/render` | `{ spec, clean }` | `.docx` binary (attachment) |

`config` = `{ baseUrl, apiKey, model }` sent per request from Settings, stored in
`localStorage` (never hardcoded, never committed). Mirrors chapter_03 config approach.

## LLM layer (`server/llm.js`)

`chat(messages, config)` → `fetch(baseUrl + '/chat/completions', ...)` with
`Authorization: Bearer <key>`, `model`, `messages`. Parse `choices[0].message.content`.
Strip ```json fences before `JSON.parse`. Throw clear error on bad key/unreachable host.

## Prompt layer (`server/prompts.js`)

Port the skill into system prompts, no new logic:

1. **analyze** — from `SKILL.md` steps 2–4 and `writing-rules.md`: extract named hard
   skills, responsibilities, seniority signals, domain, recurring vocabulary; build the
   3-verdict table (✅ Match / 🟡 Partial / 🙈 Absent); emit blunt fit estimate; list
   absent items explicitly. Must return JSON: `{ requirements, matchTable, fit, absent[] }`.
2. **generate** — from `SKILL.md` step 5 + `resume-json.md` schema: return a full spec
   JSON with `==highlight==` for JD-matched changes, `[placeholder]` for candidate-only
   facts, `**bold**` for metrics. Enforce the non-negotiables (never invent skills/dates/
   metrics; numbers become `[placeholder]`).

## Docx renderer (`server/render_resume.js`)

Port `resume-helper/resume-tailor/scripts/build_resume.js` verbatim into a module
exporting `render(spec, clean)`. Keep identical:
- `docx` npm package
- theme defaults (`ink/slate/accent/fill/muted/rule/font/highlight`) with `spec.theme` override
- inline markup parser (`==x==` highlight, `[x]` red bold, `**x**` bold)
- placeholder audit — `--clean` refuses build if any `[placeholder]` remains (HTTP 422)
- block builders (name/title/contact/heading/body/role/meta/bullet/row/note)
- A4, single column, `spec.margin ?? 0.5`

Returns a Buffer; Express sends as attachment.

## Frontend flow (`src/App.jsx`)

Three-step wizard, single page:

1. **Input** — two textareas (Master resume, Job description) + Settings drawer
   (baseUrl, key, model) + optional `.txt`/`.md`/`.csv` upload that fills the textareas
   (CSV parse: `Company,Job Title,Job Description` rows like `linkedin_jobs.csv`).
   Button: **Analyze**.
2. **Match table** — render `matchTable` (✅/🟡/🙈), requirements grouped, fit verdict,
   absent items. This is the gate from step 4. Buttons: **Back** / **Generate resume**.
3. **Resume** — rendered preview (`preview.jsx`): highlights yellow, placeholders red
   bold, bold metrics. Actions: **Download .docx (working)**, **Download .docx (clean)**,
   **Export JSON**. Clean download surfaces the 422 placeholder list inline as a warning.

`api.js` wraps the three endpoints; loading/error states per step.

## Reuse (do not reinvent)

- Chapter_05 `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`,
  `src/styles.css`, `src/main.jsx` — copy the scaffolding + shared UI classes.
- `resume-helper/resume-tailor/scripts/build_resume.js` — source of truth for docx render.
- `resume-helper/resume-tailor/references/resume-json.md` + `writing-rules.md` — source
  of truth for the prompts.
- `chapter_04_JobKitAI/output/.specs/pramod_dutta_accenture.json` — real spec example to
  smoke-test the renderer.

## Dependencies

- Runtime: `react`, `react-dom`, `express`, `docx`
- Dev: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`,
  `concurrently`, `lucide-react`

## Verification

1. `cd chapter_04_JobKitAI/resume-tailor-app && npm install && npm run dev`
2. Paste the Accenture JD (from `linkedin_jobs.csv`) + a master resume; set a working
   OpenAI-compatible endpoint.
3. **Analyze** returns a match table with ✅/🟡/🙈 verdicts and absent items.
4. **Generate** returns a spec; preview shows yellow highlights, red placeholders, bold.
5. **Download .docx (working)** produces an editable file opening in Word/Google Docs;
   highlights/colors survive.
6. **Download .docx (clean)** on a spec with `[placeholder]` returns 422 and shows the
   offender list; after filling/removing them, clean copy builds.
7. **Export JSON** round-trips: the exported spec re-renders to identical docx.
