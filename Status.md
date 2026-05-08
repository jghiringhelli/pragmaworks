# pragmaworks — Status

*Last updated: May 7, 2026, end-of-session checkpoint.*

## Current state

**`v0.2.0-pre` — structurally complete; orchestrator TODOs pending implementation.**

The package was relocated from `gs/gs-onboardkit` and renamed to `pragmaworks` to serve as the unified entry point for the cookbook flows on pragmaworks.dev. Over a focused session, claude CLI invocations under GS discipline built out the full codebase: 43 TypeScript files, ~4,500 LOC, all under `src/`. `npm install` succeeds. `npx tsc --noEmit` passes with zero errors.

## What's in place

### Foundation (laid in initial relocation)

- `CLAUDE.md` — sentinel for AI sessions in this repo
- `forgecraft.yaml` — governance, minimum_score 13, full T1 cascade required
- `docs/specs/spec.md` — canonical functional spec
- `docs/specs/domain.md` — vocabulary
- `docs/specs/architecture.md` — module boundaries, data flows
- `docs/specs/mcp-tools.md` — 11 MCP tool contracts
- `docs/specs/use-cases/audit.md`, `migrate.md`, `onboard.md` — flow specifications
- `docs/adrs/0001` brand · `0002` library composition · `0003` PDF engine · `0004` chart library · `0005` calibration anchors
- `prompts/mvp-guide.md`, `migration-refinement.md`, `onboarding-briefing.md`, `licensing-trigger.md`, `judgment-layer-disclaimer.md`, `bootstrap-clarify.md`

### `src/` — 43 files, ~4,500 LOC

```
src/
├── index.ts                       # legacy onboardkit entry, @deprecated
├── assembler.ts                   # inherited orchestrator pattern (still used by index.ts)
├── chronicle.ts                   # adapter (inherited)
├── codeseeker.ts                  # adapter (inherited)
├── forgecraft.ts                  # adapter (inherited)
├── questions.ts                   # interactive Q&A (inherited)
├── renderer.ts                    # legacy renderer entry (inherited; superseded by renderer/)
├── types.ts                       # consolidated types (300 LOC)
├── cli/
│   └── index.ts                   # CLI subcommand dispatch (211 LOC)
├── mcp/
│   └── server.ts                  # 11 tools registered with Zod schemas (263 LOC)
├── orchestration/
│   ├── index.ts                   # barrel
│   ├── shared.ts                  # collectGap, branchSafeTimestamp helpers
│   ├── audit.ts                   # pragmaworks_audit_repo (231 LOC)
│   ├── remediate.ts               # pragmaworks_remediate (152 LOC)
│   ├── bootstrap.ts               # pragmaworks_bootstrap_project (137 LOC)
│   ├── migrate.ts                 # pragmaworks_migrate_project (155 LOC)
│   ├── onboard.ts                 # pragmaworks_onboard_developer (142 LOC)
│   ├── after-report.ts            # pragmaworks_generate_after_report (100 LOC)
│   └── harness.ts                 # pragmaworks_setup_harness (111 LOC)
├── analyzers/
│   ├── index.ts                   # barrel
│   ├── git-history.ts             # team-habit data (137 LOC)
│   ├── ai-bugs.ts                 # AI-introduced bug rate (124 LOC)
│   ├── rubric.ts                  # seven-properties scoring (delegates to forgecraft) (72 LOC)
│   └── disciplines.ts             # structural disciplines applicability (57 LOC)
├── renderer/
│   ├── index.ts                   # barrel
│   ├── html.ts                    # buildHtmlReport (92 LOC)
│   ├── pdf.ts                     # generatePdf via puppeteer (94 LOC)
│   ├── charts.ts                  # 5 chart types via Chart.js CDN (103 LOC)
│   ├── last-page.ts               # licensing + judgment-layer disclaimer (103 LOC)
│   ├── sections-registry.ts       # single source of truth for ordering
│   └── sections/01-cover.ts ... 08-roadmap-remediation.ts  # 8 section renderers
├── sentinel/
│   ├── detect.ts                  # priority-list sentinel detection (51 LOC)
│   └── write.ts                   # writeWithSentinelRespect (131 LOC)
└── git/
    ├── branch.ts                  # createBranchFromHead with dirty-tree guard
    ├── commit.ts                  # commitFiles
    └── status.ts                  # isDirtyWorkingTree
```

### Verified

- `npm install` succeeds
- `npx tsc --noEmit` passes with zero errors across the entire codebase
- All commits ship with conventional-commit messages
- Every file references its source spec/ADR in doc comments

## What's NOT yet implemented

Per the spec, several orchestration steps remain as TODOs pointing at the modules they require:

- **`audit.ts` step 3-6**: parallel adapter calls + score assembly + render + write artifacts
   - The skeleton sequences correctly; the actual calls into adapters/analyzers/renderer need wiring
- **`analyzers/rubric.ts`**: forgecraft delegation TODOs — waits for `forgecraft-mcp` v1.5+ to publish to npm (the new APIs live on `feat/executable-sprint`)
- **`analyzers/disciplines.ts`**: same — uses forgecraft cap 3 disciplines catalog
- **`bootstrap.ts`**: forgecraft cascade-setup integration
- **`harness.ts`**: per-stack scaffolding generation logic
- **`migrate.ts`**: stage 2 refinement-conversation prompt orchestration
- **`renderer/sections/`**: each section has graceful "data not available" fallback; real renderings happen when audit JSON is fully populated

## Critical-path next actions

In dependency order:

1. **Publish `forgecraft-mcp` v1.5.0 to npm** from `feat/executable-sprint` branch. This unblocks pragmaworks's rubric and disciplines analyzers, which currently have TODOs at the forgecraft delegation.
2. **Wire `audit.ts` end-to-end** — replace the TODOs with actual adapter calls so `npx pragmaworks audit .` produces a real (if rough) JSON+HTML+PDF.
3. **Run `pragmaworks audit` on the pragmaworks repo itself.** Self-audit is the discipline test.
4. **Seed calibration anchors** by running pragmaworks against 10-15 public OS repos. Same scoring run feeds gs-index marketing publication.
5. **README polish + first npm publish** (v0.2.0-pre or v0.2.0).
6. **Public-repo validation** per roadmap week 4: pick 5-8 repos with known issues and have volunteers (or us) run the cookbook against each. Capture friction. Tighten prompts.

## Sister-repo state

| Repo | Branch | Latest | What's there |
|---|---|---|---|
| `chronicle-mcp` | master | `3432773` | Library entry + project-scoped instance |
| `codeseeker` | master | `326976c` | Library entry |
| `forgecraft-mcp` | `feat/executable-sprint` | `7790c0c` | Calibration anchors + sentinel detection + disciplines catalog (cap 1+2+3) |

## Notes for next session

A Claude Code (or Cursor) session opened in this folder should:

1. Read `CLAUDE.md` first.
2. Read this `Status.md` to know what's already shipped vs pending.
3. Pick the next critical-path item (above).
4. Continue under GS discipline — spec amendments first if scope expands; skeleton TODOs filled in dependency order.

The discipline test is real: this entire `src/` tree was built in one afternoon by four to five claude CLI invocations operating from the foundation laid earlier in the same session. The cookbook works on us before we run it on customers.
