# MVP Guide — used by `pragmaworks_bootstrap_project`

*The structured conversation that turns a 2-sentence idea into a complete enough specification for greenfield generation. Used by the greenfield bootstrap orchestrator. Embedded in `prompts/mvp-guide.md` and referenced from `src/orchestration/bootstrap.ts`.*

The cookbook promises the user "answer a few clarifying questions briefly, sit back, the AI does the work." This prompt is what makes that promise deliverable: a short, well-shaped conversation that collects enough decisions to produce a coherent spec without overwhelming the user.

---

## Conversation principles

- **Three questions max in the first round.** If a follow-up is necessary it can be asked one at a time during generation. Do not front-load every architectural decision.
- **Default to picking.** If the user says "I don't know" or defers, the AI picks based on the answer to the previous question. The user is told what was picked and why.
- **Sized for an afternoon.** The MVP scope must produce something runnable in 2-3 hours by AI. If the user describes something obviously larger, recommend slicing.
- **Bias toward boring tech.** First-cookbook-experience is not the time for novel tech stack choices. Pick well-trodden paths (TypeScript+Next.js, Python+FastAPI, etc.) unless the user explicitly wants otherwise.

---

## The three questions

### Question 1 — MVP scope (smallest useful version)

> Before I start, what's the smallest version of this that's still useful to you? Two or three sentences. Examples:
>
> - *"It tracks games played and shows a list. Multi-user comes later."*
> - *"Just the data ingestion pipeline; the dashboard's a phase 2."*
> - *"A web form that submits to one endpoint and stores the result."*

**Why this matters.** Without this, the AI generates everything that could be in scope. The MVP scope is the constraint that makes the spec finite.

### Question 2 — Tech stack preference

> Any preference on language or framework? Python, TypeScript, Go, Rust, Next.js, FastAPI, etc. If you don't have a preference, I'll pick a stack that fits the MVP scope and is well-supported by AI tooling. Defaults I use:
>
> - **Web app with a database** → TypeScript + Next.js + SQLite (Prisma) for local, Postgres for hosted
> - **API service** → Python + FastAPI + Postgres
> - **CLI tool** → TypeScript + Node + commander
> - **Data pipeline** → Python + pandas/polars + DuckDB for local

**Why this matters.** Tech stack constrains every downstream decision (deps, deploy, harness). If the user has no preference, the AI's defaults are good enough; do not interrogate.

### Question 3 — Hosting / persistence

> Local-only on your machine, or hosted somewhere (we can target Vercel / Railway / Fly with the deployment scripts)? If you don't know yet, "local for now" is fine — we can add hosting later.

**Why this matters.** Determines whether T2 (deployment scripts) targets a local docker-compose or a real cloud platform. Adds production concerns (env vars, secrets management, CDN) only when relevant.

---

## What the AI does after answers come back

The orchestrator delegates to `forgecraft-mcp` to set up the spec cascade tailored to the answers:

- **Functional spec** (`docs/PRD.md` or `docs/specs/spec.md`) — distilled from the user's idea + MVP scope
- **CLAUDE.md** — sentinel file with hard constraints and tool-sequencing rules tailored to the chosen stack
- **forgecraft.yaml** — governance, tier T1, applicable structural disciplines for the chosen stack
- **Behavioral contracts** (`docs/use-cases.md`) — derived from the MVP scope description
- **ADRs scaffolding** — empty templates for the decisions the AI will make during generation
- **package.json / pyproject.toml / Cargo.toml** — initialized with appropriate runtime + test deps
- **Test harness scaffolding** — vitest/playwright for TS, pytest for Python, etc.

Then the AI proceeds with code generation under that spec. **The AI does not ask the user more questions before generating** — it generates, and when it discovers gaps, it captures them as ADR-pending or as inline TODOs the user reviews after generation.

## When NOT to use this prompt

- For brownfield (existing project): use `prompts/audit-instructions.md` instead. Brownfield never asks scope questions — the existing code is the answer.
- For migration: use `prompts/migration-refinement.md` (the migration flow has its own specialized refinement conversation that builds on top of an extracted spec).
- For onboarding: use `prompts/onboarding-briefing.md`. Onboarding is read-only briefing, not generation.

## Edge cases

**User describes something massive in question 1.** Suggest slicing: *"That sounds like the full system. For an afternoon's MVP, what's the single workflow you'd demo first to convince yourself it works?"* Get them to a smaller MVP rather than over-promise on the timeline.

**User insists on an exotic tech stack the AI doesn't know well.** Be honest: *"I can target [exotic stack] but my generation will be more cautious and slower. If this is a learning exercise that's fine. If you want to ship by dinner, [boring stack] is more reliable. Your call."* Then proceed with whichever they choose.

**User skips question 3.** Default to local-only. Add hosting in a follow-up session when the user actually wants to deploy.
