---
name: using-gs-skills
description: Discovers and invokes Generative Specification skills. Use when starting any session in a repo that follows GS — or any session where a CLAUDE.md mentions Generative Specification, ForgeCraft, the seven canonical properties, or the six-tier lifecycle cascade. This is the meta-skill that orients the agent to GS and routes to the correct anchor skill.
---

# Using GS Skills

## Overview

Generative Specification is the discipline that closes the gap between AI-assisted code generation and stateless reader correctness. It is the lifecycle framework above the practitioner-skill layer (spec-driven development): six tiers (T1 Development → T2 Staging → T3 Production → T4 Evolution → T5 Synthesis → T6 Meta-telos), each removing both an authoring and a verification obligation, with a verification harness that recurs at every tier with stage-appropriate tests.

This meta-skill identifies which lifecycle entry point applies to the current task and routes to the corresponding anchor skill. The anchor skills delegate substantive work to `pragmaworks` MCP tools — the skills are the routing/orientation layer; pragmaworks is the substance.

## Skill Discovery

```
Task arrives in a GS-bearing project
    │
    ├── ENTRY POINTS (where work begins)
    │     ├── New project / empty folder / "I have an idea" ────→ gs-bootstrap
    │     ├── Existing project / "audit this" / "what's wrong?" ─→ gs-audit
    │     ├── Audit result in hand / "fix the findings" ────────→ gs-remediate
    │     ├── Existing project → new stack / "we're rewriting" ──→ gs-migrate
    │     └── Joining a codebase / "brief me" ──────────────────→ gs-onboard
    │
    ├── ENFORCEMENT (the hard tiers — auto-fire on context match)
    │     ├── Session start in a GS repo / before merge / before deploy → gs-cascade-check
    │     ├── Just deployed / "is it live?" / "smoke test" ──→ gs-verify-deploy
    │     ├── Prod incident / drift / "p99 went up" / 5xx ─→ gs-monitor-production
    │     └── Confirmed spec-change candidate / ADR overturn → gs-evolve-spec
```

If none of these clearly applies, do not invent a flow. Ask the user which entry point they want, citing the five options above.

**Entry points vs enforcement.** The five entry-point skills (top group) are user-initiated — the user wants to start work and picks the route. The four enforcement skills (bottom group) are context-initiated — they fire automatically when their description matches a recent user message or system state. Enforcement skills are how GS prevents the "I'll skip verification this once" drift that the prior paradigm reliably fails. The discipline is not in the user remembering; it is in the AI auto-firing the skill when the trigger phrase appears.

## Non-Negotiable Behaviors

These apply across all anchor skills.

### Sentinel-Aware Write

Before writing or overwriting any sentinel file (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules/*`, `forgecraft.yaml`, `docs/specs/*.md`, `docs/adrs/*.md`), check whether it exists. If it does, the default is to **augment in place, not overwrite.** Surface the existing content first, propose the addition, get the user's go-ahead before merging. Only overwrite when the user explicitly says so.

### Judgment Layer

The cascade automates everything *except* the irreducibly human work: domain expertise, aesthetic and quality discernment, strategic decisions about what should exist, compliance sign-off, real user research. When you reach a judgment-layer call, **stop and surface it** — do not synthesize the answer. Pragmaworks's `prompts/judgment-layer-disclaimer.md` lists the categories.

### Branch Isolation

All pragmaworks flows operate on a fresh branch (`pragmaworks/<flow>-<timestamp>`). Never modify `main` or the user's working branch directly. The MCP tools enforce this; if you find yourself outside that branch, stop and re-anchor.

### Public-Surface Diff

When pragmaworks's manifest is in play, treat the `api_surface` field as load-bearing. Changes to public APIs trigger the documentation cascade; do not silently change function signatures, return types, or exported names without naming the cascade impact.

## Tier Context

- **Entry-point skills** operate at T1 (Development) — the dev-cycle entry. `gs-migrate` additionally carries implicit T2 (deployment scripts derived from spec).
- **Enforcement skills** span tier boundaries: `gs-cascade-check` is cross-cutting (verifies coherence across all tiers); `gs-verify-deploy` is the T2 → T3 transition; `gs-monitor-production` is T3 (Production); `gs-evolve-spec` is T4 (Evolution).
- T5 (Synthesis) and T6 (Meta-telos) are not currently invokable as skills — they are framework concerns above the workflow-entry layer.

## What Lives Where

- **Skills** (this directory): routing, orientation, gates, when-to-use guidance
- **`pragmaworks/prompts/`**: the structured prompts each skill invokes (bootstrap-clarify, mvp-guide, migration-refinement, onboarding-briefing, judgment-layer-disclaimer, licensing-trigger)
- **`pragmaworks/src/`**: the MCP tools that do the actual work (`pragmaworks_*` registered in `src/mcp/server.ts`)
- **`forgecraft-mcp`**: the quality-gate engine; pragmaworks calls into it via adapter
- **`chronicle-mcp`**: the persistent-memory engine; pragmaworks records flow outcomes here
