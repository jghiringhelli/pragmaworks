# pragmaworks — Domain Glossary

*Version 0.1 · May 7, 2026.*

The vocabulary every contributor and AI session in this repo must use consistently. If a term shifts meaning across files, the resulting confusion compounds quickly. Keep this glossary canonical.

## Audit

A read-only analysis of an existing repository under GS discipline. Produces a structured AuditResult JSON, plus HTML and PDF reports, on a new branch. Never modifies application code. Always branch-isolated. Triggered by `pragmaworks_audit_repo`.

## After-report

A second report generated after a remediation run, comparing initial AuditResult against final AuditResult, with deltas and charts. Triggered by `pragmaworks_generate_after_report`.

## Anchor / Calibration anchor

A real-codebase example that grounds a property score at a specific level (0/1/2). Lives in `anchors/<property>/<score>.md`. Every score the audit produces references the anchor at the same score level. See ADR 0005.

## Audit JSON / AuditResult

The structured machine-readable output of `pragmaworks_audit_repo`. The renderer consumes this to produce HTML/PDF. The remediation orchestrator consumes this to plan fixes. Schema in `src/types.ts`.

## Bootstrap

The greenfield flow. Turn a 2-sentence idea + 2-3 clarifying answers into a working project under GS discipline. Triggered by `pragmaworks_bootstrap_project`.

## Brownfield

An existing codebase being audited or remediated. Most of the cookbook flows operate brownfield.

## Cookbook

The user-facing flow documentation hosted on `pragmaworks.dev`. Two pages: `/try` (developer cookbook) and `/leaders` (leaders cookbook). The cookbook is the v1 product surface; this package is the infrastructure that delivers what the cookbook promises.

## Discipline (GS)

Generative Specification — the methodology this package implements. Spec first; AI derives implementation; harness verifies behavior; drift is a specification violation.

## Greenfield

A new project being created from scratch. The bootstrap flow operates greenfield.

## Harness

The spec-derived test infrastructure that runs against the live application. Unit + integration + e2e + multimodal AI verification (screenshots compared against use-case visual postconditions). Triggered by `pragmaworks_setup_harness`.

## Judgment layer

The work GS does NOT remove: domain expert validation, real user testing, compliance sign-off, aesthetic and strategic decisions. Defined fully in `gs/generative-specification/docs/book/gs-book-bible.md`. Every PDF report ends with the judgment-layer disclaimer.

## Library composition

The architectural pattern for how `pragmaworks` uses the underlying tools — as runtime npm dependencies imported directly, not as subprocesses. See ADR 0002.

## Licensing trigger

The mandatory text on the last page of every PDF report distinguishing free individual use from paid commercial use. Text lives in `prompts/licensing-trigger.md`.

## Provisional score

A property score marked as provisional when the calibration anchor library lacks coverage for that property at that level. Surfaces in the report so users know the rubric is incomplete for that case rather than the system silently producing weakly-grounded numbers.

## Remediate / Remediation

Apply a prior audit's prioritized improvement plan, item by item, under spec-governed AI orchestration. Each fix derives from a tightened spec; the harness verifies. Triggered by `pragmaworks_remediate`.

## Sentinel / Sentinel handling

Detection and respect of pre-existing AI behavioral files (`CLAUDE.md`, `agents.md`, `.cursor/rules`, etc.). pragmaworks maps output into existing files rather than overwriting. See `src/sentinel/detect.ts`.

## Seven GS properties

The canonical list scored by the audit: Self-describing, Bounded, Composable, Verifiable, Auditable, Defended, Executable. Each scored 0/1/2 with evidence and improvement path. Defined in detail in the white paper.

## Structural disciplines

Engineering disciplines the audit evaluates applicability for: SOLID, TDD presence, hexagonal architecture, clean architecture, layered design pattern, DDD vocabulary. Codebase is scored on each that applies; disciplines that don't apply are skipped.

## T1 / T2 / T3 / T4 / T5 / T6

The six-tier lifecycle-stage obligation cascade defined in the white paper §4. Each tier carries authoring AND verification obligations; the harness is cross-cutting and recurs at every tier with stage-appropriate tests, not a separate tier. T1 (Development — spec, code, harness) is fully in scope for v0.x. T2 (Staging / Pre-prod — deployment from spec) is partially supported via forgecraft-mcp delegation. T3 (Production — monitoring) and T4 (Evolution) are out of scope for this package (T3 is `forgecraft-eye` territory). T5 (Synthesis) and T6 (Meta-telos) are higher-order tiers not orchestrated here.

## Team-habit analysis

Commit-history-driven analysis surfacing organizational metrics: PR review density, regression test coverage of past bugs, AI-introduced bug rate, commit-size distribution, collaboration graph. Output as a separate PDF. Triggered by `pragmaworks_analyze_team_habits`.

## Underlying tools

The three runtime npm dependencies this package composes: `forgecraft-mcp`, `codeseeker`, `chronicle-mcp`. Each is also independently installable as a standalone MCP. See `docs/specs/architecture.md` for composition details.
