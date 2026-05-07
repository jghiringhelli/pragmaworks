# pragmaworks — Status

*Last updated: May 7, 2026.*

## Current state

`v0.1.0` — foundation laid. The package was relocated from `gs/gs-onboardkit` and renamed to `pragmaworks` to serve as the unified entry point for the cookbook flows on pragmaworks.dev.

What's in place:
- **Foundation copied from gs-onboardkit** — adapters for ForgeCraft / CodeSeeker / Chronicle, the assembler, the renderer skeleton, the question flow, the type definitions
- **Package identity updated** — name, description, keywords, dependencies
- **CLAUDE.md sentinel** — broader scope reflecting cookbook-flow ownership
- **README.md** — public-facing positioning
- **forgecraft.yaml** — governance updated for the broader scope; minimum_score raised to 13

What still needs to happen (per `soma/docs/PRAGMAWORKS-ROADMAP.md`):

| Piece | Status |
|---|---|
| 1. Unified `pragmaworks` package | Foundation in place; needs scope expansion |
| 2. Conversational orchestration prompts | Not started — `prompts/` directory empty |
| 3. Report generator (HTML + PDF) | Not started — `src/renderer/` to build |
| 4. Brownfield analyzers (team-habit, AI-bug) | Not started — `src/analyzers/` to build |
| 5. Calibration anchors | Not started — `anchors/` directory to populate |

## Next session protocol

A Claude Code (or Cursor) session opened in this folder should:

1. Read `CLAUDE.md` first (this folder's sentinel).
2. Read `docs/specs/spec.md` (when authored — see *T1 work pending*).
3. Apply the GS discipline: spec first, then implementation derived from spec, then harness.
4. Use the existing adapters (`src/forgecraft.ts`, `src/codeseeker.ts`, `src/chronicle.ts`) — they were inherited from gs-onboardkit and are functional.
5. Extend, don't duplicate. The `assembler.ts` orchestration is the right pattern; add audit/remediate/report orchestrators alongside it.

## T1 work pending (immediate)

Author the following before any new implementation:

- `docs/specs/spec.md` — full functional specification covering all cookbook flows
- `docs/specs/domain.md` — vocabulary (audit, remediation, judgment layer, calibration anchor, sentinel, etc.)
- `docs/specs/architecture.md` — module boundaries, library composition, MCP+CLI dual entrypoint, data flow
- `docs/specs/mcp-tools.md` — full MCP tool surface contracts (the 9 tools listed in CLAUDE.md cookbook mapping)
- `docs/specs/cli-contracts.md` — CLI subcommand contracts
- `docs/specs/use-cases/` — one file per cookbook flow (bootstrap, audit, remediate, report, after-report, team-habits, etc.)
- `docs/adrs/` — ADRs for: brand decision, composition strategy (library vs subprocess), PDF engine, chart library, calibration approach
- `prompts/` — conversational orchestration prompts referenced by `CLAUDE.md`
- `anchors/` — calibration anchor library starter (3 anchors per property to begin)

## Inherited from gs-onboardkit (preserved, may need extension)

- `src/assembler.ts` — orchestrator pattern (the pattern is right; broader scope means more orchestrators alongside, not replacing)
- `src/forgecraft.ts`, `src/codeseeker.ts`, `src/chronicle.ts` — adapters (likely need expansion to cover more underlying-tool surface)
- `src/questions.ts` — interactive Q&A pattern (foundation for the conversational prompts)
- `src/renderer.ts` — output rendering (skeleton only; the audit-report renderer will be a substantially bigger build)
- `tests/` — existing tests (kept; some will become irrelevant or need rewriting)
- ESLint, Vitest, husky, commitlint setup — kept as-is
