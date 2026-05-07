# Use Case — Brownfield audit

*Implements the leaders-cookbook step "Run the audit" and the developer-cookbook brownfield flow. MCP tool: `pragmaworks_audit_repo`.*

## Actor

A developer, tech lead, or engineering manager running the audit on an existing repository through their AI assistant.

## Precondition

- The user has opened their AI assistant (Claude Code, Cursor, etc.) in the repository root.
- The repository has a git history (the audit reads commit history for some sections).
- `pragmaworks` is installed as an MCP, OR the user has invoked the AI assistant with permission to install it via npm.

## Main flow

1. AI assistant invokes `pragmaworks_audit_repo` with `repoPath` set to the current working directory.
2. Orchestrator (`src/orchestration/audit.ts`):
   a. Detects existing sentinel files (CLAUDE.md, agents.md, etc.) via `src/sentinel/detect.ts`.
   b. Creates a new branch `pragmaworks/audit-<ISO timestamp>` from current HEAD.
   c. In parallel, with graceful degradation:
      - **forgecraft adapter** scores the seven GS properties using the calibration anchor library; evaluates applicable structural disciplines.
      - **codeseeker adapter** runs semantic and structural code analysis; surfaces module boundaries, dead code, hot paths, etc.
      - **git-history analyzer** computes documentation health (which files exist, how stale they are vs current code), test pyramid coverage (counts of unit/integration/e2e tests), and security/logging baseline.
      - **disciplines analyzer** reports which structural disciplines apply and how the codebase scores against each.
   d. Assembles the structured `AuditResult` JSON.
3. Orchestrator invokes the renderer:
   a. `src/renderer/html.ts` produces the HTML report.
   b. `src/renderer/pdf.ts` runs Chromium against the HTML to produce the PDF.
4. Orchestrator writes outputs to `<repo>/pragmaworks/audit-<timestamp>/`:
   - `audit.json` — the canonical machine-readable result
   - `report.html` — manager-readable HTML
   - `report.pdf` — manager-readable PDF, with licensing-trigger and judgment-layer-disclaimer on the final page
   - `.log/` — orchestration trace (gitignored by default)
5. Orchestrator commits the new files on the new branch with message `pragmaworks: audit <timestamp> on <commit-hash>`.
6. Orchestrator returns paths and summary to the AI assistant.
7. AI assistant presents summary to the user with the file paths.

## Postcondition

- A new branch `pragmaworks/audit-<timestamp>` exists with the audit artifacts committed.
- `main` (or whichever branch was checked out) is unchanged.
- Existing sentinel files (CLAUDE.md, etc.) are unchanged unless `--override` was passed.
- The user has paths to the JSON (machine-readable) and PDF (forwarding-ready).

## Failure modes

- **Underlying tool unavailable** (e.g., codeseeker not installed): orchestrator surfaces the gap as a clearly-labeled "Section partial — tool unavailable" entry in the report. The audit completes; the report just has a hole. Never silently skip.
- **Anchor library lacks coverage for a property at a level**: the score for that property is marked `provisional` in `audit.json` and rendered with a "(provisional — calibration anchor missing)" tag in the report.
- **Branch creation fails** (e.g., dirty working tree): orchestrator returns an error before doing any work and tells the AI to ask the user to commit/stash first. Never auto-stash.
- **PDF generation fails** (e.g., Chromium not available): HTML is still produced; orchestrator returns paths.html only and notes the failure.

## Notes for the renderer

The eight report sections defined in `docs/specs/spec.md` §5 must appear in order. The seven GS property scores are rendered as a radar chart in the cover summary AND as a stacked-bar chart per property in section 5. Anchor references are clickable links in HTML, footnoted in PDF.

## Out of scope for this use case

- Running the remediation plan (separate use case at `docs/specs/use-cases/remediate.md`)
- Generating an after-report (separate use case at `docs/specs/use-cases/after-report.md`)
- Running team-habit analysis (separate use case at `docs/specs/use-cases/team-habits.md`) — the audit may include team-habit data when `includeTeamHabits: true` is set, but the team-habit-only invocation is its own use case
