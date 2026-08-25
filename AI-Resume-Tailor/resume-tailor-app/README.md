# Resume Tailor App

Personal web app. Paste a job description + master resume, get a fit-gap match table,
a tailored resume spec, a highlighted preview, and a downloadable `.docx` — without
invoking the `resume-tailor` skill.

## Quick start

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787

Open Settings, point at any OpenAI-compatible `chat/completions` endpoint
(OpenAI, Groq, LM Studio, or local Ollama at `http://localhost:11434/v1`), add key +
model. Config stays in `localStorage`, never committed.

## Workflow

1. **Input** — paste master resume + job description (or upload `.txt`/`.md`/`.csv`;
   CSV expects `Company,Job Title,Job Description` rows). Analyze.
2. **Match table** — ✅ Match / 🟡 Partial / 🙈 Absent, requirements, blunt fit, absent
   list. This is the gate. Generate resume.
3. **Resume** — highlighted preview, download working/clean `.docx`, export JSON.

Clean download returns HTTP 422 listing remaining `[placeholder]`s inline.

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/analyze` | `{ resume, jd, config }` | match table, requirements, fit, absent list |
| POST | `/api/generate` | `{ resume, jd, analysis, config }` | resume JSON spec |
| POST | `/api/render` | `{ spec, clean }` | `.docx` binary |

`config` = `{ baseUrl, apiKey, model }`.
