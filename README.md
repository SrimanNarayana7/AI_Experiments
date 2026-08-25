# 🤖 AI Experiments

A hands-on journey into AI engineering — learning, experimenting, building,
and documenting practical AI concepts and applications.

## 📚 Learning Journey

- Day 1 — Introduction to AI & LLMs
- Day 2 — LLMs, Open vs Closed Models & Hallucination
- Day 3 — Prompt Engineering & RICE-POT
- Day 4 — Open/Closed Models, Ollama & Local LLMs
- ...

## 🧪 Projects

- [**Job Application AI Copilot**](job-application-ai/) — AI-powered job application management platform for tracking jobs, generating tailored resumes, and managing a master resume library. Includes a responsive dashboard, resume workflow, global search, a command palette, and a polished SaaS-style UI. See its [README](job-application-ai/README.md) for setup and quick start steps.
- [**AI Bug Triage**](Bug-Triage-Agent/) — Enterprise React + Vite + TypeScript dashboard that runs an existing Langflow bug-triage workflow against a Jira issue key and renders severity, priority, impact areas, and root-cause analysis. Includes a markdown report parser, dynamic issue resolution via Langflow tweaks, and friendly error handling for unavailable issues. See its [README](Bug-Triage-Agent/README.md) for setup.
- [**Flaky Test Analyzer**](Flaky-Test-Analyser-Agent/) — Enterprise React + Vite + TypeScript dashboard for the existing Langflow `FlakyTest_AI_Agent` workflow. Upload two Playwright `result.json` files (Build 1 baseline, Build 2 comparison); the app sends both to Langflow and renders flaky tests, consistent failures, rerun/engineering recommendations, and suite health in a professional QA reliability dashboard. Includes a tolerant report parser, staged analysis progress, typed API error handling, and a copyable raw AI Analysis panel. See its [README](Flaky-Test-Analyser-Agent/README.md) for setup.
- [**AI Resume Tailor**](AI-Resume-Tailor/) — A `resume-tailor` skill plus a React + Vite web app that tailors a master resume to a job description without invoking a Claude skill. Paste a JD + master resume, get a fit-gap match table (✅ Match / 🟡 Partial / 🙈 Absent), a highlighted preview, and downloadable working/clean `.docx`. The `resume-tailor` skill enforces honest, ATS-safe tailoring with visible `==highlights==`, `[placeholders]`, and `**bold**` metrics. See the [app README](AI-Resume-Tailor/resume-tailor-app/README.md) for setup and the [skill](AI-Resume-Tailor/resume-tailor/SKILL.md) for the workflow.

