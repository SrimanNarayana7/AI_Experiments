# AI Resume Tailor

Tailor an existing resume to a specific job description — honestly, in an ATS-safe way,
and with every change visible so the candidate can approve it.

The repository contains two pieces:

- **`resume-tailor/`** — a skill that turns a resume + job description (JD) into a tailored
  resume with a fit-gap match table, a highlighted preview, and a downloadable `.docx`.
- **`resume-tailor-app/`** — a React + Vite web app that does the same job without
  invoking the skill, using any OpenAI-compatible `chat/completions` endpoint.

## Quick start (web app)

```bash
cd resume-tailor-app
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787

See the [app README](resume-tailor-app/README.md) for setup and workflow.

## Skill (`resume-tailor/`)

The `resume-tailor` skill follows a six-step workflow: read inputs, extract real JD
requirements, cross-reference against the resume, report the match table before writing,
build the resume, then deliver it. Its non-negotiables: never invent skills, tools,
employers, dates, or metrics; numbers come from the candidate as `[placeholders]`;
reframing is fair, relabelling is not.

Inline markup makes edits auditable:

| Markup | Renders as | Purpose |
|---|---|---|
| `==text==` | yellow highlight | a change made for this JD |
| `[text]` | red bold | a fact only the candidate can supply |
| `**text**` | bold | a metric or term worth drawing the eye to |

Read the full workflow in [`resume-tailor/SKILL.md`](resume-tailor/SKILL.md).

## Design notes

[`resume-tailor-ui.md`](resume-tailor-ui.md) captures the locked design decisions for the
web app — LLM layer, endpoint shapes, docx renderer, and the three-step frontend flow.