# pragmaworks

> **AI Readiness Audit and Remediation, in a conversation.** Unified CLI and MCP for [Generative Specification](https://doi.org/10.5281/zenodo.19637142) — library-composes [ForgeCraft](https://www.npmjs.com/package/forgecraft-mcp), [CodeSeeker](https://www.npmjs.com/package/codeseeker), and [Chronicle](https://www.npmjs.com/package/chronicle-mcp) into one tool. Backs the cookbook flows on **[pragmaworks.dev/try](https://pragmaworks.dev/try)** and **[/leaders](https://pragmaworks.dev/leaders)**.

## What it does

- **Greenfield bootstrap** — turn a 2-sentence idea into a working project under GS discipline. Spec, code, tests, deployment scripts, all derived from a written specification.
- **Brownfield audit** — analyze any existing repo, score the seven GS properties with evidence, generate a manager-readable HTML/PDF report, propose a prioritized remediation plan.
- **Remediation** — apply the plan under spec-governed AI orchestration. Branch-isolated. Every fix derives from a tightened spec, not an ad-hoc patch.
- **After-report** — side-by-side before/after deltas with charts. The receipts that show what changed.
- **Team-habit analysis** — commit history → PR review density, regression coverage, AI-introduced bug rate, collaboration graph. Organizational metrics no static analyzer surfaces.

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

## Documentation

- **Cookbook (developer)** — [pragmaworks.dev/try](https://pragmaworks.dev/try) — greenfield + brownfield paths, conversation-driven, an afternoon each.
- **Cookbook (leaders)** — [pragmaworks.dev/leaders](https://pragmaworks.dev/leaders) — for tech leads, managers, VPs, CTOs. Brownfield only, with the team-habit/KPI layer.
- **Pricing & tiers** — [pragmaworks.dev/teams](https://pragmaworks.dev/teams)
- **The discipline (white paper)** — [doi.org/10.5281/zenodo.19637142](https://doi.org/10.5281/zenodo.19637142)
- **Internal spec** — `docs/specs/` in this repo

## License

MIT for individual use. Commercial use of multi-repo dashboards, team KPIs, Chronicle Team, and remediation orchestration at scale requires a Team or Enterprise license — see [pragmaworks.dev/teams](https://pragmaworks.dev/teams).

## Status

`v0.1.0` — initial release. The conversational orchestration prompts, report renderer, and team-habit analyzer are under active build per the [PragmaWorks Execution Roadmap](https://github.com/jghiringhelli/soma/blob/main/docs/PRAGMAWORKS-ROADMAP.md). v1.0 ships when the cookbook flows complete reliably for volunteers outside our team.

## Contact

- Issues and feature requests: GitHub Issues on this repo
- Email: juan@pragmaworks.dev
- For Concierge engagements (done-for-you remediation): juan@pragmaworks.dev
