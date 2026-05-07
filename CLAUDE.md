# pragmaworks

The unified PragmaWorks suite — CLI + MCP server. Delivers the cookbook flows on
`pragmaworks.dev/try` (developer cookbook) and `pragmaworks.dev/leaders` (leaders
cookbook): greenfield bootstrap, brownfield audit, brownfield remediation,
after-report generation, team-habit and AI-bug analysis.

Library-composes three runtime dependencies — `forgecraft-mcp` (GS rubric scoring,
sentinel CLAUDE.md governance, ADR sequencing), `codeseeker` (BM25 + vector +
RAPTOR + graph code intelligence), `chronicle-mcp` (persistent tiered AI memory) —
and exposes a small set of high-level orchestration tools to the AI assistant.

Published as `pragmaworks` on npm. Installed via `npx pragmaworks` (CLI) or via
MCP configuration in `.mcp.json` (`pragmaworks mcp` subcommand).

**Ecosystem context:**
- Strategy & coordination: `C:\workspace\PragmaWorks\soma\CLAUDE.md`
- Commercial playbook: `C:\workspace\PragmaWorks\soma\docs\PRAGMAWORKS-PLAYBOOK.md`
- Execution roadmap: `C:\workspace\PragmaWorks\soma\docs\PRAGMAWORKS-ROADMAP.md`
- White paper: `C:\workspace\PragmaWorks\gs\generative-specification\docs\white-paper\GenerativeSpecification_WhitePaper.md`
- Practitioner protocol: `C:\workspace\PragmaWorks\gs\generative-specification\docs\white-paper\GenerativeSpecification_PractitionerProtocol.md`

---

## Navigation

| When you need | Read |
|---|---|
| Suite scope, cookbook flows, MCP tool contracts | `docs/specs/spec.md` |
| Domain glossary (audit, remediation, judgment layer, calibration) | `docs/specs/domain.md` |
| Architecture and module boundaries | `docs/specs/architecture.md` |
| Conversational orchestration prompts | `prompts/` |
| Calibration anchors for the seven GS properties | `anchors/` |
| ForgeCraft governance, quality gates, sentinel rules | `.claude/index.md` |
| Architecture decisions | `docs/adrs/` |
| Cookbook flow this package backs | `https://pragmaworks.dev/try` and `/leaders` |

---

## Hard Constraints

- **Library composition, not vendoring.** ForgeCraft, CodeSeeker, and Chronicle are
  runtime npm dependencies. Do not vendor or copy their source. Update via npm.
- **Degrades gracefully** when an underlying tool is missing or fails — surface the
  gap in the report, never silently skip.
- **Reports are committed artifacts.** Audit/after-reports land in `pragmaworks/`
  on a feature branch; never overwrite `main` and never write transient files there.
- **Sentinel-aware.** When a project already has `CLAUDE.md`, `agents.md`, or
  similar AI behavioral files, map output into them rather than overriding. Use
  `--override` only on explicit request.
- **Calibration-grounded.** Every GS property score must cite an anchor from
  `anchors/` for the same score level. No anchored evidence → score is provisional,
  marked as such in the report.
- **Free-vs-paid trigger** appears on the last page of every PDF audit and after-report.
  Last page text lives in `prompts/licensing-trigger.md`.
- **Judgment-layer disclaimer** appears on the last page of every PDF.
  Text lives in `prompts/judgment-layer-disclaimer.md`.
- **Never stores secrets.** Reports contain architectural knowledge only. No tokens,
  no credentials, no PII detected from the codebase ever lands in output.
- **MCP SDK v1.** Same pattern as ForgeCraft, CodeSeeker, Chronicle.

---

## Tool Sequencing

- Before any implementation change: `docs/specs/spec.md` → `docs/specs/domain.md` → `.claude/index.md`
- Before changing the audit orchestration: read `src/orchestration/audit.ts` + the
  audit use case in `docs/specs/use-cases/audit.md`
- Before changing the remediation orchestration: read `src/orchestration/remediate.ts`
  + the remediation use case in `docs/specs/use-cases/remediate.md`
- Before changing the report renderer: read `docs/specs/report-template.md` first
- Before changing scoring logic: read the calibration anchor library in `anchors/`
- Before exposing a new MCP tool: read the MCP tool surface table in
  `docs/specs/mcp-tools.md`
- Before publishing to npm: verify peer dependency versions match installed
  versions of `forgecraft-mcp`, `codeseeker`, `chronicle-mcp`

---

## Cookbook Flow Mapping

The cookbook prompts on pragmaworks.dev map to MCP tools in this package:

| Cookbook step | MCP tool | Source location |
|---|---|---|
| Greenfield: bootstrap from idea | `pragmaworks_bootstrap_project` | `src/orchestration/bootstrap.ts` |
| Brownfield: initial audit | `pragmaworks_audit_repo` | `src/orchestration/audit.ts` |
| Brownfield: apply remediation plan | `pragmaworks_remediate` | `src/orchestration/remediate.ts` |
| Both: render PDF/HTML report | `pragmaworks_generate_report` | `src/renderer/` |
| Leaders: team-habit analysis | `pragmaworks_analyze_team_habits` | `src/analyzers/git-history.ts` |
| Leaders: AI-bug rate detection | `pragmaworks_detect_ai_bugs` | `src/analyzers/ai-bugs.ts` |
| After-report (before/after deltas) | `pragmaworks_generate_after_report` | `src/orchestration/after-report.ts` |
| Score one GS property with evidence | `pragmaworks_score_property` | `src/analyzers/rubric.ts` |
| Set up spec-derived test harness | `pragmaworks_setup_harness` | `src/orchestration/harness.ts` |

If a tool you need to add isn't in this table, add it to `docs/specs/mcp-tools.md`
first and update this navigation. Don't expose new tools without a documented contract.
