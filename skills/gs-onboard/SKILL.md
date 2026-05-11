---
name: gs-onboard
description: Briefs a developer (human or AI) joining an existing codebase. Use when the user has inherited a project, returned to a project after a long pause, or needs to understand a codebase they didn't write. Read-only; no modifications. Produces a structured briefing covering architecture, conventions, hot paths, traps, and team habits — sized for ~1 hour of orientation.
---

# GS Onboard

## Overview

Take an existing repo and produce a structured briefing that gets a new practitioner (or a fresh AI session) productive in about an hour. The briefing is built from the sentinel tree, git history, recent commit patterns, ADRs, and (optionally) team-habit analysis if Chronicle Team is configured. Onboarding is read-only — no commits, no modifications.

## When to Use

- The user is joining a codebase they didn't write
- The user is returning to a codebase after weeks/months away
- A consultant is being onboarded for a maintenance or extension engagement
- A new AI session needs to be brought up to speed without re-reading every file

**When NOT to use:**

- The user wants to score the codebase → use `gs-audit`
- The user wants to remediate findings → use `gs-remediate`
- The user wants to migrate the codebase → use `gs-migrate`
- The user is going to write code in the next 5 minutes — they don't need a full briefing; just read the CLAUDE.md and start

## The Process

### Phase 1 — Sentinel detection

Before anything else, find and read the sentinel tree:

1. `CLAUDE.md` (or `AGENTS.md`, or `.cursor/rules/`, or `.github/copilot-instructions.md`) — the architectural constitution
2. `forgecraft.yaml` — project governance config (tags, tier, customizations)
3. `docs/specs/spec.md` — the PRD or functional spec
4. `docs/adrs/` — the decision record
5. Status / progress files (`Status.md`, `docs/STATE.md`)

If a sentinel is missing, note it as a finding — the briefing will surface where the project deviates from GS convention.

### Phase 2 — Invoke the onboarding orchestrator

Call `pragmaworks_onboard_developer` with the repo path. Optionally pass `includeTeamHabits: true` if Chronicle Team is configured for the project — this layers in cross-developer habits (review density, collaboration graph, common patterns) on top of the static briefing.

The MCP tool reads `prompts/onboarding-briefing.md` to structure the output:

1. **Architecture in one paragraph** — what the system is, what it does, how the parts relate
2. **Hot paths** — the three or four code paths a maintainer will touch most often
3. **Conventions** — the local idioms (naming, error handling, test patterns) that aren't explicit in the spec
4. **Recent activity** — what changed in the last 90 days, with PR titles
5. **Open ADRs and pending decisions** — what's unresolved
6. **Traps** — files that look like X but are actually Y; intentional non-idiomatic patterns; legacy carveouts
7. **Team habits** (if Chronicle Team is on) — who tends to review what; review-density patterns; recurring discussion topics

### Phase 3 — Surface to the user

Return the briefing as a single document. Do not summarize aggressively; the user needs the texture, not the headline. ~1500-2000 words is the right ballpark.

## Takeover Variant

If the user is a consultant inheriting the project (not a new hire), pass `includeTeamHabits: true` and `mode: 'takeover'`. The briefing additionally surfaces:

- **AI-bug heuristics** (via `pragmaworks_analyze_team_habits`) — patterns common to AI-generated code that the consultant should review with extra care
- **Hand-off gaps** — sentinel pieces missing entirely, suggesting prior maintainers operated outside discipline

## Important: Read-Only

Onboarding does not create branches, does not modify files, does not commit. If the user asks "what changed in the repo?", the answer is "nothing — onboarding briefs, it doesn't author." If they want to start working, the next flow is `gs-remediate` (if they want to fix findings) or `gs-audit` (if they want to score first).

## Tier Context

T1 (Development) read-side. Onboarding is the inverse of `gs-bootstrap`: bootstrap writes the sentinel tree; onboard reads it. Same artifacts, opposite direction.
