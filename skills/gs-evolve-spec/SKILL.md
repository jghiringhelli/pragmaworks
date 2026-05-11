---
name: gs-evolve-spec
description: Governs the evolution of the specification under real-world signals — production incidents, requirement changes, ADR overturns. Use when the user has a confirmed spec-change candidate (from `gs-monitor-production` or external input) and wants to update the spec under discipline rather than hand-editing. Runs the mutation gauntlet — proposed change → impact analysis → cascade simulation → ADR draft → user approval — before the spec is rewritten. Prevents the "I'll just edit the spec" failure mode that breaks the entire downstream cascade.
---

# GS Evolve Spec (T4)

## Overview

The spec is the source of truth. A change to it cascades into every downstream artifact: ADRs, generated code, harness tests, deployment scripts, monitoring contracts. An unreviewed spec edit detonates the cascade silently — the next dev session derives from the new spec without knowing what was different and why.

T4 is the discipline of governed spec evolution. Every change runs the mutation gauntlet: what does this change, what does it break, what ADR records it, who approves it, what audit trail does it leave. The point is not to slow down spec changes — it is to make them survivable.

## When to Use

- A `gs-monitor-production` signal has been confirmed and the user wants to update the spec
- A requirements change arrived (sales call, regulatory ruling, new integration)
- An ADR is being overturned (a prior decision no longer holds)
- The mutation gauntlet should be run before any non-trivial spec change

**When NOT to use:**

- Typo / clarification edits — those are doc fixes, not spec evolution
- Bootstrapping a new section (first authoring) — that's `gs-bootstrap`
- Spec changes that have already happened and the user wants to audit retroactively — use `gs-audit` instead
- Speculative spec changes ("what if we...") — write a draft ADR with `status: proposed` and stop there; don't run the gauntlet yet

## The Process

### Phase 1 — Capture the proposed change explicitly

Before any analysis, get the user to state the change as a diff:

```
SPEC CHANGE I'M PROPOSING:
- Current: <quote from current spec>
- Proposed: <new wording>
- Trigger: <what surfaced the need — t4-signal ID / ADR ID / requirements doc>
→ Confirm before I proceed.
```

Do not infer the diff. The user's stated wording becomes the canonical proposal.

### Phase 2 — Impact analysis (cascade simulation)

Call `forgecraft check_cascade` against the proposed change. The 5-step readiness gate evaluates:

1. **Which ADRs reference this spec section?** Each one needs status review.
2. **Which use cases or NFR contracts derive from it?** Each one's verification harness needs to be re-derivable.
3. **Which monitoring rules in `monitoring-spec.md` were written from this?** Each one may need an update.
4. **Which deployment scripts assume this contract?** T2 artifacts may need to change.
5. **Public-surface diff:** does this change a public API the system promised? If so, this is a versioning event, not a silent spec edit.

The output is a structured impact report: every artifact the change touches, classified by required action (update / superseded / no-op).

### Phase 3 — Draft the ADR

Call `forgecraft generate_adr` with:

- `superseded_adrs` — IDs the change overturns
- `cascade_impact` — the report from Phase 2
- `proposed_change` — the diff from Phase 1
- `trigger` — the originating signal/requirement

The ADR is MADR format. Surface it to the user for review before the spec itself is touched.

### Phase 4 — Apply the change as a single conventional commit

Once the user approves:

1. Edit the spec
2. Update all artifacts identified in Phase 2's report
3. Commit as `feat(spec): <one-line change> (ADR-NNN)` — the ADR ID in the commit message is the audit trail

Do NOT batch unrelated spec changes into one commit. Each cascade event is one commit. The git history is the evolution log.

### Phase 5 — Re-run downstream verification

After the commit lands, fire:
- `pragmaworks_setup_harness` to refresh the harness from the updated spec
- `gs-verify-deploy` if a deployment is live (the contract may now be wider/narrower than what's deployed)
- A Chronicle entry tagged `spec-evolved` recording what changed and why — cross-session memory of the evolution event

## The Mutation Gauntlet

The phases above are the gauntlet. A spec change that skips any phase is an unreviewed mutation — it may still be correct, but it has not earned correctness. The point of the gauntlet is to make survival of the spec change verifiable, not to discourage spec changes. Specifications that cannot evolve are specifications that die.

## Pure-GS Variant (No PragmaWorks / Forgecraft)

The manual discipline:

1. Write the spec diff in a draft ADR before touching the spec
2. Search the repo for references to the spec section being changed; list every one in the ADR's "Cascade Impact" section
3. Update the ADR with the cascade plan; get a human reviewer sign-off
4. Apply the change as a single commit referencing the ADR ID
5. Re-run all tests touching the affected artifacts

This is what the skill enforces — discipline above tooling. The tooling makes it cheap; the discipline makes it correct.

## Tier Context

T4 (Evolution) — the governed-mutation tier. T4's authoring half is writing the evolution rules (mutation policies, who can approve, what gauntlet phases are mandatory). This skill is the verification half: every proposed change passes the gauntlet before landing.

## Hook Integration

A pre-merge hook (`.claude/hooks/pre-merge-spec.sh`) should refuse merges that touch `docs/specs/*.md` or `docs/adrs/*.md` without a corresponding ADR ID in the commit message. The hook fires `gs-evolve-spec` if the discipline is being bypassed.
