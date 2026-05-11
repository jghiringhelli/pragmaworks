---
name: gs-audit
description: Audits an existing codebase against Generative Specification. Use when the user points at an existing repo and asks "how does this score?", "what's wrong with this code?", "is this AI-ready?", or "where would GS catch problems?". Produces a 0-14 GS score plus a structured findings report; does not modify the repo. This is the primary brownfield entry point.
---

# GS Audit (Brownfield)

## Overview

Read an existing repository and score it against the seven canonical GS properties (Self-describing · Bounded · Composable · Verifiable · Auditable · Defended · Executable), each scored 0-2 against calibration anchors. Surface concrete findings (DP-XXX prompts) that another flow (`gs-remediate`) can act on. The audit is read-only: it produces a report on a fresh branch but does not modify code, specs, or sentinel files.

## When to Use

- An existing repository with real code that the user wants to evaluate
- The user wants to know "how does this score?" — not yet asking to fix things
- The user is preparing for a remediation engagement and wants the before-state captured
- The user is using this as a sales/qualification artifact (the score is the wedge)

**When NOT to use:**

- The folder is empty or near-empty → use `gs-bootstrap`
- The user already has an audit and wants to act on it → use `gs-remediate`
- The user wants a briefing on the code, not a score → use `gs-onboard`
- The user wants to migrate to a new stack → use `gs-migrate` (which contains an audit step)

## The Process

### Phase 1 — Sentinel-aware preflight

Before running the audit, confirm the repo doesn't already have a pragmaworks audit branch in flight. If `git branch -a | grep pragmaworks/audit-` returns anything, surface that to the user and ask whether to re-run or pick up the existing one.

### Phase 2 — Invoke the audit orchestrator

Call `pragmaworks_audit_repo` with the repo path. The MCP tool will:

1. Create a fresh branch `pragmaworks/audit-<timestamp>`
2. Run the four analyzers (`git-history`, `ai-bugs`, `rubric`, `disciplines`) against the codebase
3. Score the seven properties (0-2 each, total 0-14) against the calibration anchors in `anchors/`
4. Identify structural-discipline violations (16 disciplines, per forgecraft's catalog)
5. Generate findings as DP-XXX prompts — each one is a self-contained remediation instruction
6. Write the report to `pragmaworks/audit-<timestamp>/audit.json` and a human-readable PDF/HTML

### Phase 3 — Surface results to the user

The audit returns a JSON status. Surface the headline numbers first: total score, score-per-property, top three findings ranked by severity. Don't dump the full DP-XXX list yet — that comes in remediation if the user wants to act.

### Phase 4 — Offer the next step

Three natural next steps:
- **Stop here** — the audit is the artifact (sales/qualification mode)
- **Remediate** — pivot to `gs-remediate` to act on the findings
- **After-report** — once remediation is done, generate a side-by-side `gs-remediate` produces the after-report automatically

## Important: The Audit Does Not Modify Code

The audit branch contains only `pragmaworks/audit-<timestamp>/audit.json` and the report. No source files are touched. The branch is a recordkeeping artifact. If the user asks "why didn't anything change?", remind them this is read-only.

## Calibration Anchor Caveat

The seven property scores are anchored against `anchors/` — 10-15 open-source repos pre-scored by hand. Same code → same score (reproducibility). If the user disagrees with a score, the resolution path is to add their repo to the anchor library, not to argue the score.

## Tier Context

T1 (Development) verification half. The audit reads spec/code/harness coherence and surfaces gaps; it does not author new spec or new code.
