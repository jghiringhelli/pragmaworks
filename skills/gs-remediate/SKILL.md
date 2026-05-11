---
name: gs-remediate
description: Acts on a GS audit by generating bound DP-XXX remediation prompts and (optionally) applying them. Use after `gs-audit` has run and the user wants to close the findings. Generates one self-contained prompt per finding; the user (or an AI subagent) runs each prompt and produces a diff for the user to review. Concludes with an after-report comparing initial and final state.
---

# GS Remediate (Brownfield Fix)

## Overview

Convert audit findings into actionable, reviewable diffs. Each DP-XXX prompt is bound: it includes the relevant spec context, the failing property, the calibration anchor pattern that defines success, and the exact files to modify. Remediation is paced — the user reviews each diff before the next prompt runs, so the AI cannot drift across the full set.

## When to Use

- An audit has run (`pragmaworks/audit-<timestamp>/audit.json` exists) and the user wants to act on it
- The user wants concrete fixes, not just a score
- The user is engaged in a remediation cycle (paid concierge engagement, or self-service close)

**When NOT to use:**

- No audit exists yet → run `gs-audit` first
- The user wants to understand findings, not fix them → just describe the audit findings, don't generate DP prompts
- Changes touch deep domain logic the AI cannot verify (legal/compliance/regulated) — surface to judgment layer instead

## The Process

### Phase 1 — Locate the audit

Find the most recent `pragmaworks/audit-<timestamp>/audit.json`. If multiple exist, ask the user which one. If none exists, redirect to `gs-audit`.

### Phase 2 — Invoke the remediation orchestrator

Call `pragmaworks_remediate` with the audit path. The MCP tool will:

1. Read the audit findings (DP-XXX format)
2. Rank by severity (critical → warning → info) and structural dependency
3. Generate one self-contained prompt per finding under `pragmaworks/remediate-<timestamp>/prompts/DP-001.md`, `DP-002.md`, etc.
4. Each prompt includes: the failing property, the relevant spec excerpts, the calibration anchor pattern, the files to modify, and the success criterion

### Phase 3 — Iterate one prompt at a time

For each DP-XXX in order:
1. Read the prompt
2. Apply the change (or hand it to a fresh subagent if the change is non-trivial — apply doubt-driven-development discipline)
3. Re-run the harness; if it fails, the change is wrong — stop and surface to the user
4. Get the user's review before moving to the next DP

Do not batch DP applications. The cascade only works if each diff is reviewable.

### Phase 4 — Generate the after-report

When all DP-XXX prompts have been applied (or the user stops), call `pragmaworks_generate_after_report`. This produces a side-by-side `before/after.html` showing:
- Initial score vs final score (per property)
- Specific findings closed
- Specific findings deferred (with reason)
- Diff summary (files touched, lines changed)

The after-report is the deliverable for a remediation engagement.

## Pacing Discipline

Each DP-XXX is a contained unit of work — typically 30-60 minutes of AI time + 5-10 minutes of human review. Do not let the AI run "until everything is fixed" without checkpoints. The whole point of paced remediation is to prevent the kind of drift the audit caught in the first place.

## Tier Context

T1 (Development) authoring half. Remediation generates code/spec changes derived from the audit's verification findings. The harness re-runs after each change — that's T1's verification half closing the loop.
