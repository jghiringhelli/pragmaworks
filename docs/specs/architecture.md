# pragmaworks — Architecture

*Version 0.1 · May 7, 2026.*

## 1. Module boundaries

```
pragmaworks/
├── src/
│   ├── index.ts                  # library entry (programmatic API)
│   ├── cli/
│   │   └── index.ts              # CLI entrypoint — subcommand dispatch
│   ├── mcp/
│   │   └── server.ts             # MCP server — exposes tools to AI assistants
│   ├── orchestration/
│   │   ├── bootstrap.ts          # greenfield bootstrap
│   │   ├── audit.ts              # brownfield audit
│   │   ├── remediate.ts          # brownfield remediation (apply plan)
│   │   ├── after-report.ts       # generate after-report with deltas
│   │   └── harness.ts            # spec-derived test harness setup
│   ├── adapters/
│   │   ├── forgecraft.ts         # forgecraft-mcp library wrapper (inherited)
│   │   ├── codeseeker.ts         # codeseeker library wrapper (inherited)
│   │   └── chronicle.ts          # chronicle-mcp library wrapper (inherited)
│   ├── analyzers/
│   │   ├── git-history.ts        # PR density, regression coverage, etc.
│   │   ├── ai-bugs.ts            # AI-introduced bug rate detection
│   │   ├── rubric.ts             # seven-properties scoring with calibration
│   │   └── disciplines.ts        # structural disciplines applicability + scoring
│   ├── renderer/
│   │   ├── html.ts               # HTML report rendering
│   │   ├── pdf.ts                # PDF generation (engine: see ADR 0003)
│   │   ├── charts.ts             # chart generation (lib: see ADR 0004)
│   │   └── sections/             # one file per of the eight report sections
│   ├── sentinel/
│   │   └── detect.ts             # detect existing CLAUDE.md / agents.md / etc.
│   └── types.ts                  # shared types
├── prompts/
│   ├── bootstrap-clarify.md      # questions for greenfield clarification
│   ├── audit-instructions.md     # AI instructions for the audit flow
│   ├── remediate-instructions.md # AI instructions for the remediation flow
│   ├── licensing-trigger.md      # the "free vs paid" text on every PDF last page
│   └── judgment-layer-disclaimer.md
├── anchors/
│   ├── self-describing/{0,1,2}.md
│   ├── bounded/{0,1,2}.md
│   ├── composable/{0,1,2}.md
│   ├── verifiable/{0,1,2}.md
│   ├── auditable/{0,1,2}.md
│   ├── defended/{0,1,2}.md
│   └── executable/{0,1,2}.md
├── docs/
│   ├── specs/                    # this directory
│   ├── adrs/                     # architecture decision records
│   └── use-cases/                # one file per cookbook flow
├── tests/                        # vitest tests, mirror src/ structure
└── ...                           # standard tsconfig, eslint, husky, etc.
```

## 2. Composition strategy

`pragmaworks` is **library-composing** the three underlying tools. They are runtime npm dependencies:

```
forgecraft-mcp ───┐
codeseeker ───────┼──▶ pragmaworks (CLI + MCP)
chronicle-mcp ────┘
```

Adapters in `src/adapters/` import each tool's library exports (not its MCP server). Updates to underlying tools propagate via `npm update` without coordinated releases. See ADR 0002 for the decision rationale.

The unified MCP server in `src/mcp/server.ts` exposes ~9 high-level tools to the AI assistant. Internally, those tools call the orchestration layer; the orchestration layer calls the adapters; the adapters call the underlying tool libraries.

The CLI in `src/cli/index.ts` dispatches subcommands (`audit`, `remediate`, `report`, `mcp`) to the same orchestration layer. The `mcp` subcommand starts the MCP server; the others invoke the orchestration directly.

## 3. Data flow — brownfield audit

```
User
  ↓ (paste prompt into AI assistant)
AI Assistant
  ↓ (invokes pragmaworks_audit_repo MCP tool)
src/mcp/server.ts
  ↓ (dispatches to)
src/orchestration/audit.ts
  ↓ (in parallel, with graceful degradation:)
  ├──▶ forgecraft adapter — score 7 properties + structural disciplines
  ├──▶ codeseeker adapter — semantic + structural code analysis
  ├──▶ git-history analyzer — team-habit data (if requested)
  ├──▶ ai-bugs analyzer    — AI-introduced bug detection (if requested)
  └──▶ sentinel detector   — find existing CLAUDE.md/agents.md
  ↓ (assembles structured AuditResult JSON)
src/renderer/ — produces HTML and PDF
  ↓ (writes to)
<repo>/pragmaworks/audit-<timestamp>/  (on a new branch)
  ↓ (returns paths to)
AI Assistant
  ↓ (presents to)
User
```

Every step has a defined contract. See `docs/specs/mcp-tools.md` for input/output schemas of each MCP tool.

## 4. Data flow — greenfield bootstrap

Different shape because there's no existing repo:

```
User opens AI assistant in empty folder
  ↓ ("I want to build X. Use PragmaWorks to bootstrap this.")
AI Assistant
  ↓ (invokes pragmaworks_bootstrap_project)
src/orchestration/bootstrap.ts
  ↓ (returns clarification prompts: MVP scope? tech stack?)
AI Assistant — asks user, gets answers
  ↓ (re-invokes with answers)
src/orchestration/bootstrap.ts
  ↓ (delegates the cascade to forgecraft-mcp:)
forgecraft adapter
  ↓ (sets up the spec/CLAUDE.md/forgecraft.yaml/cascade)
back to AI Assistant
  ↓ (AI assistant uses the established spec to generate code)
working project
```

Note: in greenfield, `pragmaworks` sets up the discipline scaffolding; the AI assistant generates the code under that scaffolding using its own capabilities. We don't write code in pragmaworks for the user's project — we configure the environment in which the AI does.

## 5. Adapter contracts

Each adapter exposes a uniform interface so the orchestration layer doesn't care which underlying tool is doing what:

```ts
interface ToolAdapter {
  available(): Promise<boolean>;        // is the underlying tool callable?
  version(): Promise<string | null>;    // installed version, or null if missing
  // tool-specific methods follow…
}
```

The orchestration layer uses adapter methods. If an adapter fails or is unavailable, the orchestrator surfaces the gap in the report rather than throwing. See `src/orchestration/audit.ts` for the canonical degradation pattern (inherited from `assembler.ts`).

## 6. Branch and file conventions

When invoked against an existing repo:

- Audit output → `<repo>/pragmaworks/audit-<ISO timestamp>/` on branch `pragmaworks/audit-<timestamp>`
- Remediation output → on same branch as audit when remediation follows audit; on `pragmaworks/remediate-<timestamp>` when invoked standalone
- After-report → `<repo>/pragmaworks/after-<ISO timestamp>/`
- Team-habit report → `<repo>/pragmaworks/team-habits-<ISO timestamp>/` (separate; can run independent of audit)

The package never modifies `main`, never modifies branches it didn't create, never modifies files outside `<repo>/pragmaworks/` unless executing a remediation explicitly approved by the user.

## 7. Sentinel handling

Before any AI behavioral file is written, check for existing files. The sentinel detector at `src/sentinel/detect.ts` looks for (in priority order):

1. `CLAUDE.md` (Anthropic Claude convention)
2. `agents.md` / `AGENTS.md` (general AI agent governance convention)
3. `.cursor/rules` (Cursor)
4. `.aider.conf.yml` (Aider)
5. `.github/copilot-instructions.md` (GitHub Copilot)

If any are found, the orchestrator maps GS-required content into the existing file under labeled headers (`## GS Discipline Rules`, etc.) rather than overwriting. The `--override` flag exists for explicit cases where the user wants the file replaced.

## 8. Logging and observability

Every orchestration call logs structured events to `<repo>/pragmaworks/.log/` (gitignored by default). Logs are local-only — never transmitted off-machine — and contain the orchestration trace, adapter calls, durations, and any degradation events. Used for debugging and reproducibility verification.

## 9. Versioning

Semver. Underlying tool dependencies use caret ranges (`^1.5.0`) so minor and patch updates are picked up automatically. Major-version bumps of underlying tools require a `pragmaworks` major bump and explicit testing.
