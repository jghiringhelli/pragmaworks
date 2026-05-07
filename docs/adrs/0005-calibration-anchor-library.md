# ADR 0005 — Calibration: anchored-example library shipped with the package

*Date: 2026-05-07 · Status: Accepted*

## Context

The audit scores the seven GS properties (Self-describing, Bounded, Composable, Verifiable, Auditable, Defended, Executable) on a 0/1/2 scale. For the rubric to be defensible at a CTO meeting, two independent runs of the audit on the same repo must produce scores within ±1 across all properties (the reproducibility floor in `docs/specs/spec.md` §6).

Without grounding, AI scoring is variable: prompts produce slightly different scores on identical inputs depending on session context, model version, time of day. This is the single biggest credibility risk in the wedge.

## Decision

**Ship a calibration anchor library with the package.** For each of the seven properties at each of the three score levels (0/1/2), the package includes three anchored examples drawn from real open-source repositories. The scoring orchestrator references the anchor at the same score level when justifying its decision.

Library lives in `anchors/<property>/<score>.md` (e.g., `anchors/bounded/2.md`). Each anchor file contains:

- Repository name + commit hash
- The specific code/structural feature being anchored
- Why this example is at this score level (1-2 sentences)
- A diff or transformation that would move it to the next score level

The audit prompt invokes this as: *"Score this codebase on `<property>`. The anchored example at score 2 looks like this: [anchor]. The anchored example at score 1 looks like this: [anchor]. The anchored example at score 0 looks like this: [anchor]. Where does this codebase fit, with cited evidence from the codebase?"*

## Rationale

- **Reproducibility through grounding.** Anchored examples reduce variance: two AI sessions reading the same anchors converge on similar scores for similar codebases.
- **Defensibility at the CTO meeting.** "Why is this 1/2 on Bounded?" — the answer cites evidence from the repo and points to the anchor at score 2 showing what it would take to reach 2. Evidence and ladder, not opinion.
- **Improvement path is automatic.** The anchor at score `N+1` is the path forward from score `N`. Built into the rubric.
- **Auditable change.** When we update an anchor (because a better example surfaces, or a property gets refined), the change is in version control. Score changes have provenance.

## Consequences

- The anchor library is critical-path for v1.0. We ship 3 anchors per property per score level = 7 × 3 × 3 = 63 anchor files in the seed library. Sourcing them requires scoring 10-15 OS repos by hand (calibration sprint per `soma/docs/PRAGMAWORKS-ROADMAP.md` Week 4).
- The scoring contract must mark a property as `provisional` if the anchor library lacks coverage (not all combinations will be filled at launch). The `provisional` flag surfaces in the report.
- Anchors are part of the package distribution. The `anchors/` directory is in the `files` field of `package.json`. Updating anchors requires a package release.
- Anchor selection is a methodology decision, not a code decision. Anchors get reviewed by the founder or designated rubric maintainer before merge. Pull requests to anchors require evidence and reasoning.

## Alternatives considered

- **AI-only scoring without anchors.** Rejected. Variance kills credibility. Tested informally on small repos and saw ±2 variance across runs — unacceptable.
- **Hand-coded heuristics per property.** Rejected. Static rules age badly across stacks (a TypeScript heuristic doesn't apply to Python, etc.). The AI's strength is contextual judgment; calibration grounds that judgment without replacing it.
- **Customer-specific calibration overrides.** Considered for Enterprise tier later; not in v0.x. Default anchor library applies to everyone for v1.0.
