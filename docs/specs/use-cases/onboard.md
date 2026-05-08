# Use Case — Onboarding (developer joining or returning)

*Implements the developer-cookbook onboarding path and the takeover variant. MCP tool: `pragmaworks_onboard_developer`. Same audit engine as `pragmaworks_audit_repo`, framed as a briefing rather than a critique.*

## Actor

A developer joining a team and inheriting an unfamiliar codebase, returning to a project after time away (parental leave, sabbatical, role change), or a consultant/freelancer taking over an unknown codebase from a previous team.

## Precondition

- The user has the codebase available locally (cloned).
- The user has opened their AI assistant in the project root.
- `pragmaworks` is installed (or the AI assistant has permission to install it).
- The user knows their role and (roughly) their experience level — used to tailor the briefing.

## Main flow

1. AI assistant invokes `pragmaworks_onboard_developer` with `repoPath` and (optionally) `developerRole`, `experienceLevel`, `focusArea`, `includeTeamHabits`.
2. Orchestrator runs the same analysis as `pragmaworks_audit_repo`, but with the **onboarding-briefing prompt** (`prompts/onboarding-briefing.md`) replacing the audit-instructions prompt:
   a. Read sentinel files (CLAUDE.md, agents.md, README, etc.) for project framing
   b. Use codeseeker adapter to map architecture (modules, dependencies, entry points)
   c. Use forgecraft adapter to identify conventions in force (structural disciplines applied)
   d. Use git history for recency-of-activity per module (informs "where to start")
   e. If `includeTeamHabits: true`, run the team-habit analyzer for "how this team operates"
3. Orchestrator assembles the briefing per the six sections in `prompts/onboarding-briefing.md`:
   1. What this project is — three sentences
   2. Architecture in one diagram (mermaid)
   3. Conventions you must respect
   4. What's surprising
   5. First-task suggestions (2-3, sized to role and experience)
   6. Cheat sheet
4. Orchestrator writes outputs to `<repo>/pragmaworks/onboarding-<timestamp>/`:
   - `briefing.md` — primary output, optimized for IDE-pasted reading
   - `architectural-cheatsheet.md` — section 6 expanded as a standalone reference
   - `briefing.pdf` (if requested) — for sharing outside engineering
   - `briefing.html` (if requested) — rare; markdown is usually enough
5. Orchestrator commits on a new branch named `pragmaworks/onboarding-<timestamp>`.
6. Orchestrator returns paths and a list of suggested first tasks (with difficulty estimates) to the AI assistant.
7. AI assistant presents the briefing summary to the user.

## Postcondition

- A new branch with the briefing artifacts committed.
- `main` and existing branches unchanged.
- The user has a markdown file they can read in 20-30 minutes that tells them what they need to know to start contributing.
- 2-3 concrete first-task suggestions sized to their role and experience.

## Difference from `pragmaworks_audit_repo`

| Audit | Onboarding |
|---|---|
| Purpose: surface what's wrong | Purpose: surface what's there |
| Tone: critique with evidence | Tone: briefing with evidence |
| Output: eight-section report with remediation plan | Output: six-section briefing with first-task suggestions |
| Audience: managers, tech leads deciding what to fix | Audience: developers deciding where to start |
| Typical length: 15-30 page PDF | Typical length: 4-8 page markdown |

Both run the same analyzers (forgecraft, codeseeker, optionally team-habit). Both produce the same underlying audit data. The output framing is what differs — same data, different prompt, different document.

## Takeover variant

When `includeTeamHabits: true`, the briefing includes an additional section between sections 4 and 5:

> ### How this team has been operating (last 90 days)
>
> - PR review density: [N reviews per PR]. [Reading: thorough / cursory / nonexistent]
> - Regression tests added per bug fix: [percentage]
> - AI-introduced bug rate signal: [low / medium / high — with method]
> - Most active contributors: [names from git log]
> - Most touched modules: [files / dirs]
> - Recent fires (commits with message keywords like "fix", "hotfix", "revert"): [areas]

This is the takeover use case: a consultant or new staff engineer adopting a codebase needs to know not just what the code is, but how the previous team operated. The team-habit data answers questions like "who do I trust to ask about X" (most-active in that module) and "where are recent fires" (recent fixup commit clusters).

## Failure modes

- **Repository has no git history** (e.g., a freshly initialized clone with squashed history). Onboarding still works; the "where to start" section falls back to file-system structure and recently-modified-mtime instead of commit-graph data.
- **Repository has no README, no CLAUDE.md, no docs.** The briefing flags this prominently in section 4 ("What's surprising"): the codebase has no orientation material. Section 5 first-task suggestions include "write a README" as a high-value contribution.
- **Repository is a monorepo.** The briefing offers to scope to a sub-package; if the user declines, it produces a top-level briefing plus a cheat sheet pointer to "for module-specific briefings, run again with `focusArea: <module>`".

## Notes

- The onboarding briefing is **read-only**. It does not modify any code outside `<repo>/pragmaworks/onboarding-<timestamp>/`. It does not propose remediations. If the user wants remediations, run `pragmaworks_audit_repo` separately — same engine, different framing.
- For consulting / freelance use cases, onboarding mode + team-habit analysis is the wedge. The takeaway briefing makes the consultant credible at week one instead of week three.

## Out of scope for this use case

- Code remediation (covered by `pragmaworks_remediate`, started after audit)
- Greenfield bootstrap (covered by `pragmaworks_bootstrap_project`, used for new ideas)
- Migration to a new stack (covered by `pragmaworks_migrate_project`, the multi-stage flow)
