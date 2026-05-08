# pragmaworks — Functional Specification

*Version 0.1 · May 7, 2026 · status: drafting*

This document is the canonical functional spec for the `pragmaworks` package. Implementation derives from this; this does not describe implementation. If implementation diverges from this spec, the spec is what we trust — we tighten and regenerate.

The previous version of this spec described `gs-onboardkit`, a narrower predecessor that delivered only the day-one onboarding context package. That earlier scope is preserved in archived form at `docs/specs/archive/gs-onboardkit-spec.md` for historical reference.

---

## 1. Purpose

`pragmaworks` is the public product surface of PragmaWorks Labs LLC. It delivers two cookbook experiences hosted at `pragmaworks.dev/try` (developer cookbook) and `pragmaworks.dev/leaders` (leaders cookbook), and converts a user's plain-language conversation with their AI assistant into a working software outcome under [Generative Specification](https://doi.org/10.5281/zenodo.19637142) discipline.

The package exposes an MCP server (for AI-assistant integration) and a CLI (for direct invocation and CI/CD use). Both routes invoke the same orchestration logic.

## 2. Scope

### In scope (v0.x)

The package supports **five entry points**, each implemented as a specialized orchestration that uses the same underlying engine (FC + CS + CH) with different prompts:

- **Greenfield bootstrap.** Turn a 2-sentence idea + answers to a guided MVP conversation into a working project with spec, code, tests, and deployment scripts under GS discipline. Uses the `MVP-guide` prompt (`prompts/mvp-guide.md`) to surface the right scope decisions before generating.
- **Brownfield audit.** Analyze an existing repo, score the seven GS properties with cited evidence and calibration anchors, evaluate applicable structural disciplines, assess documentation health and test pyramid coverage, surface security/logging baseline gaps, propose a prioritized remediation plan.
- **Brownfield remediation.** Apply the audit's remediation plan under spec-governed AI orchestration, branch-isolated.
- **Migration.** Brownfield audit followed by a guided refinement conversation (what to drop, what to modernize, what NFRs to add, what tech stack to target) followed by greenfield bootstrap in a fresh folder using the refined spec. The user does not handwrite the new system; pragmaworks orchestrates the audit → refine → bootstrap chain.
- **Onboarding.** Brownfield audit run in **onboarding mode** — same engine, different prompt — produces a "what is this project, how does it work, where to start" briefing for a developer joining or returning to the codebase. Includes architectural cheat sheet, conventions, and first-task suggestions. The "takeover" use case (consultant inheriting an unknown codebase) is brownfield + onboarding + team-habit-analysis run together.

Plus the cross-cutting capabilities each flow uses:

- **After-report generation.** Side-by-side before/after report with deltas and charts (used by remediation and migration flows).
- **Team-habit and AI-bug analysis.** Commit history → PR review density, regression coverage of past bugs, AI-introduced bug rate detection, commit-size distribution, collaboration graph. Output as separate PDF. Lives in `src/analyzers/`. Optionally consumes Chronicle data when present for higher AI-attribution accuracy; falls back to heuristic detection (commit message patterns, branch naming, change size, time-of-day) when Chronicle is absent.
- **Local dashboard.** `pragmaworks dashboard` subcommand starts a local web server that renders past audit reports, score history for the current project, and (when present) Chronicle data. Replaces the standalone gs-dashboard project — same purpose, embedded in this package.
- **HTML and PDF report rendering.** Both formats from the same audit JSON. Charts via the chart library decided in `docs/adrs/0004`. PDF via the engine decided in `docs/adrs/0003`.
- **Free-vs-paid licensing trigger and judgment-layer disclaimer** on the last page of every PDF.
- **Calibration anchor library** shipped with the package — three anchored examples per score level (0/1/2) for each of the seven GS properties, per `docs/adrs/0005`.

### Out of scope (v0.x — explicitly deferred)

- **Chronicle Team** (cross-developer organizational memory) — separate longer-arc build, not gating v1. Self-hosted on customer infrastructure when shipped.
- **Hosted SaaS surfaces** — none. We host nothing customer-touching. The local dashboard subcommand serves single-user/team-on-one-machine cases. Multi-machine team dashboard is a Chronicle Team feature, also self-hosted.
- **GitHub Action / CI integration as a separate product** — explicitly NOT a separate surface. Customers add `npx pragmaworks audit` to whatever CI they already run. The AI assistant configures it for them when relevant. We do not maintain a CI-specific package.
- Stripe billing — license-key-driven, not per-call billing.
- T4/T5 production monitoring orchestration — `forgecraft-eye` territory, deferred.
- Docker / Homebrew / Chocolatey distribution surfaces — npm is enough for v1.
- IDE extensions beyond MCP — MCP integration covers Claude Code, Cursor, Windsurf, etc.

## 3. Cookbook flow obligations

The two cookbook pages on `pragmaworks.dev` describe the user-facing experience. This package must deliver each step those pages promise. Use cases per flow are in `docs/specs/use-cases/`.

| Cookbook step (developer cookbook) | This package delivers via |
|---|---|
| "Use PragmaWorks methodology to bootstrap" | `pragmaworks_bootstrap_project` MCP tool |
| AI asks 2-3 clarifying questions | `prompts/bootstrap-clarify.md` referenced by the orchestrator |
| Spec generated under GS discipline | Orchestrator delegates to `forgecraft-mcp` for cascade setup |
| T1-T2-T3 done automatically | Orchestrator runs the spec, harness, deployment cascade |
| Optional: run harness end-to-end with screenshots | `pragmaworks_setup_harness` + multimodal verification step |

| Cookbook step (leaders cookbook) | This package delivers via |
|---|---|
| "Audit this project for engineering leadership" | `pragmaworks_audit_repo` MCP tool |
| Initial PDF report (eight sections) | `src/renderer/` produces HTML+PDF from audit JSON |
| "Run team-habit analysis on last 90 days" | `pragmaworks_analyze_team_habits` MCP tool |
| "Apply the top 5 items from the remediation plan" | `pragmaworks_remediate` MCP tool |
| After-report (before/after with charts) | `pragmaworks_generate_after_report` MCP tool |
| Optional: install Chronicle for project | `pragmaworks_install_chronicle_project_scope` MCP tool |

If a cookbook page promises something this spec does not document, **the spec is wrong, not the cookbook.** Fix the spec.

## 4. The seven GS properties (canonical)

The audit scores every codebase against seven properties:

1. **Self-describing** — the system explains itself from its own artifacts; no external knowledge required
2. **Bounded** — each unit of work has explicit scope and seams
3. **Composable** — modules combine without implicit side effects
4. **Verifiable** — each obligation has an automatic verification mechanism
5. **Auditable** — each decision has a permanent ADR record (decision + rationale + alternatives)
6. **Defended** — the architecture actively rejects non-conforming outputs
7. **Executable** — the spec produces deterministic derivable output

Each property is scored 0/1/2 with cited evidence and a path to improve. Calibration anchors per property per score level live in `anchors/` per `docs/adrs/0005`.

## 5. The eight report sections (canonical)

Every audit and after-report produced by `pragmaworks` contains the same eight sections in this order:

1. **Cover summary** — overall AI readiness grade, top 3 risks, single-page format suitable for forwarding
2. **Structural disciplines** — which apply (SOLID, TDD, hexagonal, layered, clean architecture), how this codebase scores against each
3. **Documentation health** — existence, staleness, alignment to current code
4. **Test pyramid coverage** — unit, integration, e2e — gaps and skew
5. **Seven GS rubric scores** — per property, with evidence and improvement path
6. **Security and logging baseline** — obvious gaps, sensitive data handling, observability surface
7. **Team-habit analysis** — commit history patterns (or note "skipped — not requested" for individual flow)
8. **Roadmap to remediation** — prioritized action list, scoped by current architecture

Plus on the last page (mandatory):
- **Free-vs-paid licensing trigger language** (text in `prompts/licensing-trigger.md`)
- **Judgment-layer disclaimer** (text in `prompts/judgment-layer-disclaimer.md`)

## 6. Hard contracts

These are non-negotiable; violating them breaks the user trust we depend on:

- **Branch isolation.** All audit and remediation output lands on a new branch named `pragmaworks/<flow>-<timestamp>`. Never write to `main`. Never modify an existing branch the user is currently working on.
- **Sentinel respect.** When a target repo has `CLAUDE.md`, `agents.md`, or any AI behavioral file, map output into the existing file under clearly-labeled headers. Never overwrite. `--override` flag exists for explicit override; defaults to false.
- **Calibration grounding.** Every property score must cite an anchor from `anchors/` at the same score level. If the anchor library lacks coverage for a property at a level, mark the score as `provisional` in the report.
- **Reproducibility floor.** Two independent runs of `pragmaworks_audit_repo` against the same repo at the same commit (different sessions, different operators) must produce scores within ±1 across all seven properties.
- **Graceful degradation.** If an underlying tool (ForgeCraft, CodeSeeker, Chronicle) fails or is missing, produce a partial report with a clearly-labeled gap. Never silently skip.
- **No secrets in output.** Reports contain architectural knowledge only. No tokens, no credentials, no PII detected from the codebase ever lands in output.

## 7. Success criteria for v1.0

Per `soma/docs/PRAGMAWORKS-ROADMAP.md`:

- A volunteer outside our team follows `/try` (greenfield path) on a fresh idea and walks away with a working project in under 4 hours, without us in the room.
- A volunteer follows `/try` (brownfield path) on a real repo of theirs and gets two PDF reports (initial + after) with deltas they find credible.
- A tech lead or engineering manager follows `/leaders` on their team's repo and gets the team-habit/KPI report — and forwards it to a peer.
- Reproducibility test passes (±1 across two independent runs on the same repo).
- Friction-points list from each volunteer run, ≥80% of items resolved before v1.0 publish.
- At least one warm-network contact who ran the cookbook follows up about Team or Concierge tier.

If we ship v1.0 but volunteers can't complete the cookbook flows without our help, that's a failure — the tool isn't ready. We do not promote the cookbook publicly until the criteria above all pass.

## 8. References

- Cookbook (developer): https://pragmaworks.dev/try
- Cookbook (leaders): https://pragmaworks.dev/leaders
- Pricing: https://pragmaworks.dev/teams
- Playbook: `soma/docs/PRAGMAWORKS-PLAYBOOK.md`
- Roadmap: `soma/docs/PRAGMAWORKS-ROADMAP.md`
- White paper: `gs/generative-specification/docs/white-paper/GenerativeSpecification_WhitePaper.md`
- Practitioner protocol: `gs/generative-specification/docs/white-paper/GenerativeSpecification_PractitionerProtocol.md`
- Bible: `gs/generative-specification/docs/book/gs-book-bible.md`
- ADRs in this repo: `docs/adrs/0001` through `docs/adrs/0005`
