# pragmaworks

> **AI Readiness Audit and Remediation, in a conversation.** Unified CLI and MCP for [Generative Specification](https://doi.org/10.5281/zenodo.19637142) — library-composes [ForgeCraft](https://www.npmjs.com/package/forgecraft-mcp), [CodeSeeker](https://www.npmjs.com/package/codeseeker), and [Chronicle](https://www.npmjs.com/package/chronicle-mcp) into one tool. Backs the cookbook flows on **[pragmaworks.dev/try](https://pragmaworks.dev/try)** and **[/leaders](https://pragmaworks.dev/leaders)**.

## What it does

Five entry points, one engine. Each cookbook path is delivered by a specialized orchestration that uses the same underlying tools (FC + CS + CH) with different prompts:

- **Greenfield bootstrap** — turn a 2-sentence idea into a working project under GS discipline. Spec, code, tests, deployment scripts, all derived from a written specification.
- **Brownfield audit** — analyze any existing repo, score the seven GS properties with evidence and calibration anchors, generate a manager-readable HTML/PDF report (Arcana-style executive format with overall grade, "What's working", "Core problem" root-cause chain, "If nothing changes" forward-looking risks).
- **Brownfield remediation** — apply the plan under spec-governed AI orchestration. Each item becomes a DP-XXX bound prompt. Branch-isolated. Every fix derives from a tightened spec, not an ad-hoc patch.
- **Migration** — three-stage flow: audit existing system → guided refinement conversation (drop / modernize / NFR additions / tech stack) → bootstrap target folder using refined spec.
- **Onboarding** — same engine as audit, briefing-framed. "What is this project, how does it work, where do I start" for developers joining or returning. Takeover variant adds team-habit analysis.

Plus cross-cutting capabilities each flow uses:

- **After-report** — side-by-side before/after deltas with charts.
- **Team-habit + AI-bug analysis** — commit history → PR review density, regression coverage, AI-introduced bug rate (with optional Chronicle enrichment), collaboration graph. Organizational metrics no static analyzer surfaces.
- **HTML and PDF report rendering** with the mandatory licensing trigger and judgment-layer disclaimer on every PDF's last page.
- **Local dashboard subcommand** for browsing past audit reports and score history.

The user runs no commands themselves. They open their AI assistant (Claude Code, Cursor, VS Code, Aider, Windsurf), paste the prompts from the cookbook, and the assistant invokes this package's MCP tools to do the work.

## Install

### As an MCP server (recommended for AI-assistant integration)

In `.mcp.json` (Claude Code, Cursor, etc.):

```json
{
  "mcpServers": {
    "pragmaworks": {
      "command": "npx",
      "args": ["-y", "pragmaworks", "mcp"]
    }
  }
}
```

### As a CLI

```bash
npx pragmaworks audit
npx pragmaworks remediate
npx pragmaworks report --format pdf
```

Either path uses the same orchestration logic internally. The MCP exposes high-level tools to your AI assistant; the CLI invokes the same tools directly for CI/CD or scripting.

## How it composes

`pragmaworks` does not duplicate work the underlying tools already do. It **composes** them as runtime npm dependencies (library composition, not vendoring) and adds the orchestration, the report renderer, and the conversational prompts the cookbook flows depend on.

```
                            pragmaworks (this package)
                            │
                            ├── orchestration: audit, remediate, report,
                            │                  bootstrap, after-report, harness setup
                            ├── analyzers:     team-habit, AI-bug detection,
                            │                  rubric scoring with calibration
                            ├── renderer:      HTML + PDF, charts, eight sections
                            ├── prompts:       conversational orchestration
                            └── anchors:       calibration anchor library
                            │
                            ├──▶ forgecraft-mcp  (engineering standards, ADRs,
                            │                     sentinel CLAUDE.md governance)
                            ├──▶ codeseeker      (BM25 + vector + RAPTOR + graph
                            │                     code intelligence)
                            └──▶ chronicle-mcp   (persistent tiered AI memory,
                                                  five cognitive types)
```

Updates to the underlying tools propagate via `npm update` without coordinated releases. Power users who want fine-grained access to the underlying MCPs can install them separately — this package is additive, not replacement.

## The integration contract

Pragmaworks does not couple to the underlying tools at the SDK level. The only required contract is the **canonical doc-manifest schema** at `forgecraft-mcp/templates/docs-manifest.yaml`, referenced from each project's `docs/manifest.yaml`. This file declares the document taxonomy, cascade rules per commit type, recording-layer ownership, human-judgment configuration, and API surface paths.

When pragmaworks runs against a target repo:
1. It reads `docs/manifest.yaml` if present, generates one from canonical defaults if absent
2. Surfaces override needs for non-canonical paths
3. Honors the manifest's cascade severity (warning vs error) per commit type
4. Respects existing AI behavioral files (CLAUDE.md, agents.md, .cursor/rules) — maps into them rather than overwriting

See `docs/adrs/0006-manifest-contract.md` for the full rationale.

## Documentation

- **Cookbook (developer)** — [pragmaworks.dev/try](https://pragmaworks.dev/try) — four paths (greenfield, brownfield, onboarding, migration), conversation-driven, an afternoon each. Each step has an optional expandable "show me how to do this without the tools" disclosure for those who want to verify the methodology.
- **Cookbook (leaders)** — [pragmaworks.dev/leaders](https://pragmaworks.dev/leaders) — for tech leads, managers, VPs, CTOs. Brownfield only, with the team-habit/KPI layer.
- **Pricing & tiers** — [pragmaworks.dev/teams](https://pragmaworks.dev/teams)
- **The discipline (white paper)** — [doi.org/10.5281/zenodo.19637142](https://doi.org/10.5281/zenodo.19637142)
- **Practitioner Protocol** — operational companion to the white paper covering the cascade, hook chain, manifest authoring, severity ramp, audit exceptions
- **Internal spec** — `docs/specs/` in this repo (functional spec, architecture, MCP tool contracts, ADRs)

## License

MIT for individual use. Commercial use of multi-repo dashboards, team KPIs, Chronicle Team, and remediation orchestration at scale requires a Team or Enterprise license — see [pragmaworks.dev/teams](https://pragmaworks.dev/teams).

## Status

`v0.2.0-pre` — **structurally complete; orchestrator implementation TODOs pending.**

Built out under GS discipline across one focused session: ~5,400 LOC across 50+ TypeScript files, all under `src/`. `npm install` succeeds. `npx tsc --noEmit` passes with zero errors.

What's in place:
- 11 MCP tools registered with Zod schemas
- 8 orchestration files covering all five cookbook flows (audit, remediate, bootstrap, migrate, onboard, plus after-report, harness, shared helpers)
- 4 analyzers (git-history with team-habit data, ai-bugs with heuristic + optional Chronicle enrichment, rubric, structural disciplines)
- Full renderer pipeline: HTML + PDF + 5 chart types + 8 section files in Arcana executive format + mandatory licensing/judgment-layer last page
- Sentinel detection + sentinel-aware write
- Git helpers (branch, commit, status with dirty-tree guard)
- Manifest contract — `docs/manifest.yaml` adopts canonical schema with override and cascade configuration
- 6 ADRs

What's pending:
- Implementation TODOs in orchestration steps (parallel adapter calls, score assembly, render integration). Skeleton sequences correctly; actual logic wiring needs forgecraft 1.6+ on npm.
- Calibration anchor seeding by running audit against 10–15 public OS repos
- Local dashboard subcommand (Next.js scaffolding from gs-dashboard to be embedded)
- README polish + first npm publish

See `Status.md` for the full state and `docs/specs/spec.md` §7 for v1.0 success criteria.

## Contact

- Issues and feature requests: GitHub Issues on this repo
- Email: juan@pragmaworks.dev
- For Concierge engagements (done-for-you remediation): juan@pragmaworks.dev
