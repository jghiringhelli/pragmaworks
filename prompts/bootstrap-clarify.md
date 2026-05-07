# Bootstrap Clarification Prompts

*Used by `pragmaworks_bootstrap_project` when the user has provided an idea but not the clarifying answers. The orchestrator returns these to the AI assistant, which asks the user. Keep the list short — three questions max — to honor the cookbook promise of "answer briefly."*

---

When the user has supplied an idea and not (yet) supplied the clarifying answers, ask these three questions in order. Stop early if the user has already answered any of them.

## Question 1 — MVP scope

> What's the smallest version of this that's useful? Two or three sentences. Examples: "It tracks games played and shows a list. No multi-user yet." Or: "Just the data ingestion pipeline; the dashboard comes later."

## Question 2 — Tech stack preference

> Any preference on language or framework — Python, TypeScript, Go, Rust, Next.js, FastAPI, etc.? If you don't have a preference, I'll pick a stack that fits the MVP scope.

If the user defers, the orchestrator picks based on:
- "Web app with database" → TypeScript + Next.js + SQLite (Prisma) for local, Postgres for hosted
- "API service" → Python + FastAPI + Postgres
- "CLI tool" → TypeScript + Node + commander
- "Data pipeline" → Python + pandas/polars + DuckDB for local
- Otherwise → ask the user a more specific follow-up

## Question 3 — Hosting / persistence

> Local-only on your machine, or hosted somewhere (we can target Vercel/Railway/Fly with the deployment scripts)? If you don't know yet, "local for now" is fine.

---

After the answers come back, the orchestrator delegates to `forgecraft-mcp` to set up the spec cascade (functional spec, CLAUDE.md, ADRs scaffold, behavioral contracts, forgecraft.yaml), tailored to the answers. The AI assistant then has everything it needs to generate code under that discipline.

**Do not ask more than three questions.** If the spec turns out to be incomplete after generation begins, that's a sign the answers were too thin — capture the gap as a follow-up question, but proceed. Tightening the spec during generation is normal GS practice; making the user answer twelve questions upfront is not.
