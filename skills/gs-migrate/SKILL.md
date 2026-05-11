---
name: gs-migrate
description: Migrates an existing system to a new stack under Generative Specification discipline. Use when the user is staring at a stack migration (Rails → Next.js, Python 2 → Python 3, monolith → microservices, legacy → modern). Three-stage flow: brownfield audit → guided refinement → greenfield bootstrap in a new folder. The source system is untouched on main; the migration artifact lives on a branch.
---

# GS Migrate

## Overview

Migration is the use case where the **judgment layer** is most visible. Keep/drop/modernize decisions are the user's; pragmaworks surfaces the choices and their consequences but does not decide. The flow has three discrete stages — each gated, each independently inspectable.

## When to Use

- The user has an existing system and wants to migrate it to a new tech stack, platform, or significantly modernized version
- The user can articulate "what we want to keep" vs "what should change" at a high level
- The user has access to the source system locally (cloned, readable)
- The target folder is identified (empty, or a fresh repo to migrate into)

**When NOT to use:**

- The user wants a literal port (every wart preserved) → skip stage 2 entirely, audit-then-bootstrap directly
- The user wants to refactor the same stack → use `gs-remediate`, not migrate
- The user wants to evaluate a system before deciding to migrate → use `gs-audit` first, then revisit

## The Process

### Stage 1 — Audit the source system

Call `pragmaworks_migrate_project` with `sourceRepoPath` and `targetFolderPath`. The MCP tool runs `pragmaworks_audit_repo` against the source in **stack-independent extraction mode**:

- Behavioral contracts (what does it do?)
- Data models (what does it store?)
- Integration points (what does it call?)
- Use cases (who uses it for what?)

Framework-specific implementation details are noted but not preserved as primary spec. The audit JSON lives at `<source-repo>/pragmaworks/migration-<timestamp>/audit.json` on a new branch.

Returns: `status: 'audit-complete'` with the path to the extracted spec.

### Stage 2 — Guided refinement (judgment layer)

This is the slow part. The migration-refinement conversation (per `prompts/migration-refinement.md`) walks five passes:

1. **Feature triage** — for each extracted feature: keep / drop / modernize
2. **Tech stack decision** — single bundled choice (language, framework, DB, deployment)
3. **NFR additions** — what wasn't in the source that needs to be in the target (logging, rate limits, encryption, audit trail)
4. **Modernization opportunities** — polling → WebSocket, homegrown queue → managed queue, etc.
5. **Confirm what stays the same** — preserved API contracts, schemas, regulated logic

Surface each pass one at a time. Do not batch. The user must answer before the next pass runs.

Return to the orchestrator with `refinementAnswers` populated.

### Stage 3 — Bootstrap the target

Call `pragmaworks_migrate_project` again with the refinement answers. The MCP tool will:

1. Merge refinement answers into the extracted spec → **refined target spec**
2. Delegate to `pragmaworks_bootstrap_project` against `targetFolderPath` with the refined spec as input
3. Set up the cascade in the target folder (CLAUDE.md, forgecraft.yaml, `docs/specs/spec.md`, `docs/specs/migration-context.md`, `docs/adrs/0001-migration-decisions.md`)
4. Generate code under the established spec
5. Return `status: 'bootstrapped'` with paths to generated artifacts

## Source System is Untouched on main

The source system gets a new branch (`pragmaworks/migration-<timestamp>`) with the audit JSON. Main is never modified. The target folder gets all the new artifacts. Both repos remain available for parity testing.

## Failure Modes

- **Source too large to audit in one pass** → orchestrator scopes by directory; migrate in slices ("Migrate the API service first, then the frontend")
- **Refinement conflicts with source reality** → orchestrator surfaces "You said drop feature X, but feature Y depends on it. Drop both, keep both, or rethink?"
- **Target stack incompatible with source data model** → orchestrator surfaces "Target stack doesn't natively support [feature]. Adapt with [workaround], or change target?"

## Tier Context

T1 (Development) + implicit T2 (deployment scripts derived from refined spec). T3 / T4 are not part of migration — they enter once the target is running in production.
