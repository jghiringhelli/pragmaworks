# Onboarding Briefing — used by `pragmaworks_onboard_developer`

*Same audit engine as `pragmaworks_audit_repo`, framed differently. The audit answers "what's wrong with this project"; the onboarding briefing answers "what is this project and where do I start."*

When a developer joins a team, returns from time away, or picks up an inherited codebase, they spend the first week pattern-matching from incomplete signals: README skim, asking around, reading ADRs if they exist, opening files semi-randomly. Onboarding mode collapses that week into a structured briefing the AI assistant can produce in an hour.

---

## Briefing principles

- **Briefing, not critique.** Onboarding mode is read-only. It does not propose remediations. If the developer asks "should I fix X?" the answer is "later — first understand it, then look at the audit if you want to fix it."
- **Tailored to role.** A frontend dev needs different framing than a backend dev or a data engineer. The briefing structure adapts.
- **Actionable in week one.** Always end with 2-3 concrete first-task suggestions sized for the developer's stated experience level. Vague "explore the codebase" is not actionable.
- **Cite the source.** Every claim about how the codebase works points at the file/line that supports it. The developer can verify by reading.

---

## The briefing structure

```
1. What this project is — three sentences
2. The architecture in one diagram (text or mermaid)
3. The conventions you must respect — bulleted, with examples
4. What's surprising — the thing a new dev usually gets wrong
5. Where to start — 2-3 first-task suggestions sized to your role and experience
6. Cheat sheet — file/folder map, commands, environment setup, links
```

Each section follows.

### Section 1 — What this project is

Three sentences max. What the system does for whom and why it exists. No history, no philosophy, no vendor pitches. Drawn from README + commit history + use-case extraction.

### Section 2 — Architecture in one diagram

A simple boxes-and-arrows view of the major components and their dependencies. Mermaid or ASCII; whichever renders cleanly in markdown. Ten boxes max. Goal: a developer can sketch this from memory after one read.

### Section 3 — Conventions

The rules the codebase follows that aren't obvious from skimming. Examples:

> - Service layer never imports from the route layer (one-way dependency, enforced by ESLint rule in `eslint.config.js`)
> - All public API responses are `{ data, error }` shaped (see `src/api/types.ts`)
> - Tests live alongside source as `*.test.ts` (not under a separate `tests/` folder)
> - Migrations are forward-only — never edit a deployed migration

5-10 items. Each cites the file/line where the convention is enforced or documented.

### Section 4 — What's surprising

The thing a new dev usually gets wrong because it contradicts a reasonable expectation. Examples:

> - The `users` table is read-replica-eventually-consistent — do not rely on read-after-write within the same request unless you use the `forceConsistent` flag
> - The frontend uses `react-query` for data fetching but state is managed by a homegrown reducer pattern, not Redux or Zustand — see `src/state/`
> - There's no separate staging environment; PRs deploy to ephemeral preview URLs and prod is gated behind a manual approval

If there's no surprise, say so explicitly: *"The codebase is conventional for its stack; nothing surprising."*

### Section 5 — First-task suggestions

2-3 concrete tasks the developer can pick up in week one, sized to their stated role and experience level. Format:

> **Task A — [name]** (~4 hours, easy)
> [Description]. Touches: [files]. Test coverage: [yes/no]. Why it's a good first task: [reason — usually involves a well-isolated module with good tests].

> **Task B — [name]** (~1 day, medium)
> [Description]. ...

Tasks are drawn from open issues if `gh issue list` is available, from TODO comments in code, from outdated documentation, or from low-hanging refactor opportunities the audit would have surfaced. Tasks are NOT remediations from a security/quality standpoint — those belong in the audit, not the onboarding briefing.

### Section 6 — Cheat sheet

Quick-reference appendix:

- File/folder map: top-level dirs and what lives in each (15 lines max)
- Commands cheat sheet: how to install, run, test, deploy
- Environment setup: required tools, versions, config files
- Where to look for X: 5-10 common "where do I find" questions answered in one line each
- Useful links: README, CONTRIBUTING, key ADRs, internal wiki/docs if any

---

## Adaptation by role

The briefing adapts based on `developerRole`:

| Role | Emphasis |
|---|---|
| `frontend` | UI architecture, component conventions, state management, testing patterns |
| `backend` | Service architecture, data flow, persistence, error handling, observability |
| `full-stack` | Both, with a slight reduction in depth on each |
| `data` | Pipelines, schemas, transformations, data quality conventions, lineage |
| `devops` | Deployment topology, CI/CD, environments, secrets management, monitoring |
| `other` | Generic emphasis on what the AI infers as the dev's likely starting point |

## Adaptation by experience level

- `junior` — More links to docs and tutorials. First tasks are smaller (2-4 hours). Cheat sheet is more verbose.
- `mid` — Default depth. First tasks are 4-8 hours. Cheat sheet is concise.
- `senior` / `staff` — Less hand-holding. First tasks include architectural questions and high-leverage refactors. Cheat sheet is minimal — assumes they can read code.

## Format

Default output is `markdown` (most useful for IDE-pasted reading and for sharing in Slack/email). PDF is offered for cases where the briefing is being given to someone outside the engineering team. HTML is rare — the markdown is usually fine.

## When this is part of a takeover engagement

For consultants/freelancers inheriting unknown codebases, run with `includeTeamHabits: true`. The briefing then includes a section "How this team has been operating" with PR review density, who-touches-what, AI-introduced bug rate over the last quarter. Surfaces who to talk to and where the recent fires were.
