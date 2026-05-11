---
name: gs-cascade-check
description: Verifies the cascade is coherent before any non-trivial change — that the sentinel tree is intact, the spec/ADR/code references are aligned, and no orphan artifacts exist. Use before merge, before deploy, before any structural edit, and at session start in a GS-bearing project. This is the read-only audit that fires automatically as a gate; it does not modify the repo but refuses to proceed if the cascade is broken.
---

# GS Cascade Check (Cross-Cutting Gate)

## Overview

The cascade is what makes GS work: spec → code → harness → deployment → monitoring → evolution, with each downstream artifact derivable from the one above. A broken cascade is silently corrupt — the AI generates code from a spec that contradicts the ADR, the harness tests something the spec no longer says, the deployment runs against a contract that was changed without record.

This skill is the **read-only gate** that catches cascade breakage before it produces a bad commit, a bad merge, or a bad deploy. It fires automatically at session-start, before-merge, and before-deploy boundaries; the result is binary — proceed or stop. It does not modify the repo.

## When to Use

- **Session start in a GS-bearing project.** The first thing the AI does is run this skill to know whether the cascade is in a working state. If it isn't, surface the breakage to the user before the AI does anything else.
- **Before any commit that touches `docs/specs/`, `docs/adrs/`, `forgecraft.yaml`, or sentinel files.**
- **Before merge to main.** No matter who is merging, the cascade must be coherent at merge time.
- **Before deploy.** A broken cascade means the deployment may not match what was specified.
- **When the user says "are we clean?", "is everything aligned?", "can we ship?"**

**When NOT to use:**

- Inside a session that just made an authorized cascade change (the change is in flight; the gate would fail by design until the change completes)
- For trivial edits that don't touch the cascade (README, comments, test fixtures) — the cost of the gate isn't justified
- During `gs-evolve-spec`'s Phase 2 — that phase IS the cascade check at higher resolution

## The Process

### Phase 1 — Invoke the 5-step readiness gate

Call `forgecraft check_cascade`. The 5 steps:

1. **Sentinel tree completeness** — CLAUDE.md, forgecraft.yaml, docs/specs/spec.md, docs/adrs/, and the navigational sentinels all present and parseable
2. **Spec/ADR alignment** — every ADR references a spec section that still exists; every spec section has at least one ADR justifying it (or a `provenance: initial-authoring` marker)
3. **Spec/code alignment** — every public function/type in `src/` traces to a use case or NFR contract; every use case has at least one implementing file
4. **Spec/harness alignment** — every NFR contract has a corresponding harness test; every harness test cites the spec section it derives from
5. **No orphan artifacts** — no ADRs marked `superseded` still being referenced; no use cases without implementation; no test files for use cases that don't exist

### Phase 2 — Surface results

The check returns one of three states:

- **Green** → cascade is coherent; proceed. Surface a one-line summary: "Cascade coherent (5/5 steps). Last validated at <timestamp>."
- **Yellow (warnings)** → cascade is functional but has soft violations (orphan ADRs marked superseded but still referenced, deprecated use cases not yet removed). List the warnings; let the user decide whether to fix now or defer.
- **Red (errors)** → cascade is broken; **refuse to proceed.** List the broken steps and route to the relevant skill: missing sentinel → `gs-bootstrap` (or repair manually); broken spec/code alignment → `gs-remediate`; broken spec/harness alignment → `pragmaworks_setup_harness`.

### Phase 3 — Record the check

Whether green, yellow, or red, write a Chronicle entry: `mcp__chronicle__chronicle action=remember memory_type=architectural tags=[cascade-check, <project>] content="<result + state>"`. This is the audit trail of when the cascade was last verified and what state it was in.

## The Gate is a Wall, Not a Suggestion

The whole point is that the gate refuses to proceed when broken. If the user says "skip the check, just merge", surface the cost: "Skipping the cascade gate is fine for emergency merges, but record an exception in `.forgecraft/exceptions.json` with severity and rationale so the next gate-check knows this was intentional, not invisible." Then accept the user's decision.

## Pure-GS Variant (No PragmaWorks / Forgecraft)

The manual discipline is the same check, walked by hand:

1. Read CLAUDE.md, forgecraft.yaml (or equivalent), docs/specs/, docs/adrs/
2. For each ADR, find its referenced spec section. Missing? Note it.
3. For each public function in src/, find its use case. Missing? Note it.
4. For each NFR contract, find its harness test. Missing? Note it.
5. Surface the list. Decide what to fix.

This is the discipline the skill enforces. The tooling makes the check survive scale; the manual check works on small repos.

## Tier Context

Cross-cutting. The cascade-check skill is not bound to one tier — it verifies the relationships between tiers. T1's authoring derives from the spec; T2's deployment scripts derive from the spec; T3's monitoring contract derives from the spec; T4's evolution gauntlet operates on the spec. If the spec isn't internally coherent, every downstream tier is poisoned. This skill protects that coherence.

## Hook Integration

The forgecraft hook chain runs cascade-check at:
- `pre-commit` (warning level on cascade violations; doesn't block but logs)
- `pre-merge` (error level on broken cascade; blocks merge)
- `pre-deploy` (error level on broken cascade; blocks deploy)
- `session-start.sh` (info level; surfaces yellow/red to the AI before user input)
