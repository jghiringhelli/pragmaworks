---
name: gs-bootstrap
description: Bootstraps a new project under Generative Specification discipline. Use when the user has an idea and an empty folder (or near-empty repo) and wants a runnable artifact under GS by the end of the session. Use when the user says "I want to start a new project", "let's build X from scratch", or "set up this empty folder for GS".
---

# GS Bootstrap (Greenfield)

## Overview

Take a two-sentence project idea and produce a coherent specification, then derive a runnable artifact from it. The bootstrap flow writes the sentinel tree (CLAUDE.md, forgecraft.yaml, docs/specs/, docs/adrs/), runs a short clarifying conversation (three questions max), then hands off to code generation under the established spec.

## When to Use

- The user has an idea and an empty (or near-empty) folder
- No existing CLAUDE.md, no existing specs, no existing forgecraft.yaml
- The work is sized for an afternoon — runnable artifact in 2-3 hours, not a multi-week project
- The user wants the discipline cascade installed, not just code generation

**When NOT to use:**

- The folder already has substantial code → use `gs-audit` (brownfield) instead
- The user wants to copy code from another project → use `gs-migrate`
- The user wants to understand an existing codebase → use `gs-onboard`
- The work is a single-file utility or one-line script — the cascade overhead isn't worth it; just write the code

## The Process

### Phase 1 — Verify the precondition

Confirm the folder is empty or near-empty (no CLAUDE.md, no `src/` with substantial code, no `docs/specs/`). If it isn't, redirect to `gs-audit`.

### Phase 2 — Invoke the bootstrap orchestrator

Call `pragmaworks_bootstrap_project` with the folder path. The MCP tool will:

1. Read `prompts/bootstrap-clarify.md` and surface the three clarifying questions to the user (MVP scope, tech stack, hosting)
2. Wait for the user's answers (or fill in defaults per `prompts/mvp-guide.md` when the user defers)
3. Generate the sentinel tree: CLAUDE.md, forgecraft.yaml (`tier: T1`), `docs/specs/spec.md` (the PRD), `docs/specs/use-cases.md`, `docs/adrs/0001-initial-stack.md`
4. Scaffold the project skeleton (package.json / pyproject.toml / etc.) for the chosen stack
5. Set up the dev-time harness (vitest / pytest / etc.)

### Phase 3 — Code generation under the spec

Once the cascade is in place, the AI proceeds with code generation **under the spec it just wrote** — every implementation decision is bound by what's in `docs/specs/spec.md`. Spec gaps surface as `TODO: ADR-XXX` markers that get resolved during generation.

### Phase 4 — First verification

Before declaring done, run the harness. The harness must pass; if not, the spec is wrong, the code is wrong, or both — return to spec.

## The Three Questions (cookbook flow)

When pragmaworks_bootstrap_project surfaces these, do not let the user over-answer. Three questions, two-sentence answers each. If the user defers, the tool picks per `prompts/mvp-guide.md` defaults and tells the user what it picked and why.

1. **MVP scope** — the smallest version that's still useful
2. **Tech stack preference** — or "you pick" (boring tech defaults apply)
3. **Hosting** — local-only, or hosted (Vercel/Railway/Fly)

## Surface These Decisions Explicitly

Before invoking the MCP tool, state your assumptions about the folder state (is it really empty? is the user sure they don't want to audit an existing repo?) and let the user correct you.

## Tier Context

T1 (Development) authoring + verification. The bootstrap flow writes the spec and scaffolds the harness in one cycle.
