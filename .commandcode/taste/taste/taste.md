# Taste
- Wants planning output to include concrete implementation details — specific backend classes, endpoints, config properties, tests, and frontend components — not just high-level architecture ("give me the implementation details"). Confidence: 0.8
- Keeps product requirements/specs in markdown files inside the project repo and expects plans to be grounded in those files as the source of truth; when several spec/plan files exist, the newest consolidated/merged spec is treated as authoritative and the plan is rewritten to match it exactly (reconciling any conflicts). Confidence: 0.8
- Prefers full-implementation plans over architecture-only or core-subset scoping when planning a release. Confidence: 0.6
- Prefers backend auto-detection of input type over explicit UI selection (tabs or routes), keeping a single form and avoiding new frontend dependencies. Confidence: 0.6
- Secrets come from environment variables server-side only (e.g., Groq key via `GROQ_API_KEY`); leaked hardcoded keys should be replaced with env-var placeholders and flagged for rotation. Confidence: 0.9
- Wants claims about passing tests and working features backed by actually executing them — never claim a test passed unless it was run; report actual pass/fail results. Confidence: 0.6
