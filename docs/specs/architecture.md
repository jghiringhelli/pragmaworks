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

## 10. Three-layer recording architecture

Pragmaworks does not own the storage of project, individual, or team memory — it orchestrates flows that read and write across three independent layers, each owned by a sister tool. The integration glue between them is a single YAML file: `docs/manifest.yaml`, sourced from `forgecraft-mcp/templates/docs-manifest.yaml` (see ADR 0006). No tool depends on another at the SDK level.

### 10.1 The three layers

```
                       ┌──────────────────────────┐
                       │  docs/manifest.yaml      │
                       │  (per project)           │
                       │  schema_source: ─────────┼──→ forgecraft canonical schema
                       └──────────────────────────┘
                                  ▲
                  ┌───────────────┼────────────────┐
                  │               │                │
           ┌──────────────┐  ┌────────────┐  ┌──────────────────┐
           │  Project     │  │ Individual │  │ Team             │
           │  layer       │  │ layer      │  │ layer            │
           │              │  │            │  │                  │
           │  forgecraft  │  │ chronicle  │  │ chronicle-team   │
           │  + repo      │  │            │  │                  │
           └──────────────┘  └────────────┘  └──────────────────┘
                  │                                 │
                  │  forgecraftScore/Tier/Pass      │
                  └─────────────────────────────────┘
                       (forgecraft writes,
                        chronicle-team reads via axon verify)
```

| Layer | Owner | Stores | Lives in |
|---|---|---|---|
| **Project** | `forgecraft-mcp` + the repo itself | specs, ADRs, decisions, use-cases, roadmaps, schemas, contracts, hooks, gates | the project's `docs/` + `.claude/hooks/` + `.forgecraft/` |
| **Individual** | `chronicle-mcp` | prompt history, findings, work style, personal patterns | local memory store (`~/.chronicle/`) |
| **Team** | `chronicle-team` | shared findings, ticket integration, workload split, prompt analytics | shared DB + dashboard |

The layers are independent but propagate: ADRs decided at the team layer flow back into project ADRs in the repo; insights at the individual layer can promote to team; changes in the project repo update both individual context (the next chronicle session reads them) and team dashboards.

### 10.2 How the cookbook flows interact with each layer

| Cookbook flow | Project layer | Individual layer | Team layer |
|---|---|---|---|
| **Greenfield bootstrap** | Pragmaworks asks forgecraft to scaffold `docs/manifest.yaml` + the canonical taxonomy + cascade hooks. Cascade enforced from commit one. | Chronicle (if installed) starts a session, surfaces docs/specs/ and docs/use-cases/ as the dev works. | None unless chronicle-team is installed; then the new repo registers and its roadmap items flow into the workload-split queue. |
| **Brownfield audit** | Pragmaworks reads the existing `docs/manifest.yaml` if present; otherwise generates one with overrides for legacy paths. The audit scores the project layer against the canonical schema and surfaces gaps. | Chronicle's individual memory is read (if present) to enrich AI-bug attribution. Not written. | Chronicle-team is read (if reachable) for cross-repo team-habit context. Not written. |
| **Brownfield remediation** | Pragmaworks runs forgecraft's setup-hooks + propose_session against the now-manifest-aware repo. Cascade severity ramps per the manifest's `cascade_overrides` block. | Chronicle records the remediation session for future recall. | Chronicle-team receives a `forgecraftScore`/`forgecraftTier`/`forgecraftPass` payload when remediation completes (post-results integration). |
| **Migration** | Audit + greenfield in sequence; both interact with the project layer as above, in two separate target folders. | Chronicle bridges sessions across both folders so refinement context flows forward. | Same as remediation — completion posts results upstream. |
| **Onboarding** | Read-only against the project layer. Generates a briefing file in `<repo>/pragmaworks/onboarding-<timestamp>/`. | Chronicle (if installed) surfaces relevant individual memory; the briefing seeds a fresh memory tier when none exists. | Read-only; team-habit data optionally enriches the briefing. |
| **Team-habit analysis** | Reads commit history from the project layer. | Chronicle data optionally consumed for higher AI-attribution accuracy. | Chronicle-team data optionally consumed for cross-repo aggregation. |
| **After-report** | Re-reads the project layer at the after-state. Diffs against the before-audit JSON. | None. | Optionally posts after-state results to chronicle-team. |

### 10.3 The manifest as integration contract

Every interaction in the table above goes through the manifest. Forgecraft writes hooks and gates; chronicle decides which docs to surface at session start; chronicle-team decides which ticket maps to which spec. None of them call each other's APIs. They each open `docs/manifest.yaml`, read the relevant block, and stay in their lane.

Pragmaworks orchestrates by:

1. **Reading the manifest first.** Every cookbook flow starts by reading (or generating) `docs/manifest.yaml`. Path resolution order: project's `overrides:` → project's top-level fields → canonical schema defaults.
2. **Routing by layer.** Project-layer work delegates to the forgecraft adapter; individual-layer reads/writes go through the chronicle adapter; team-layer interactions go through chronicle-team's HTTP surface (`scripts/post-results.cjs` pattern).
3. **Degrading gracefully.** If chronicle is missing, pragmaworks reports the gap and continues with project-only data. Same for chronicle-team. The manifest stays intact.

This is what the `recording:` block in the manifest documents — which tool owns which layer — so any future tool that wants to participate (a different individual-memory store, an alternate team dashboard) can declare itself in the same block without code changes here.

### 10.4 What pragmaworks must NOT do

- **Do not call forgecraft's, chronicle's, or chronicle-team's internal APIs across the layer boundary.** Talk to forgecraft about the project layer only; never poke chronicle's memory store from the project layer.
- **Do not silently write the manifest.** Manifest authoring is a hard contract (see `spec.md` §6) — the user is told.
- **Do not vendor the canonical schema.** Reference it by `schema_source:` only. If forgecraft ships an updated schema, projects pick it up by bumping the forgecraft version in their dependency tree, not by us copying the new file in.
