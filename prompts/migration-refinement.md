# Migration Refinement — used by `pragmaworks_migrate_project`

*The conversation between the brownfield audit (extract spec from existing system) and the greenfield bootstrap (build new system from spec) in the migration flow. This is where the user decides what NOT to carry forward, what to modernize, and what new concerns to introduce.*

A migration done naively reproduces every wart of the source system in the target. A migration done well is the rare opportunity to drop unused features, modernize tech stack, add NFRs that were missing, and tighten what was always meant to be tighter. This prompt makes that opportunity explicit.

---

## Conversation principles

- **Show, don't ask blindly.** The audit already extracted what the source system does. The refinement conversation surfaces specific things in that spec and asks "keep, drop, modernize, or change?"
- **Recommend defaults.** For each item, propose a default disposition. The user accepts or overrides. Do not make them re-think every decision.
- **Surface NFR opportunities.** Migrations are when teams realize they never had observability, never had auth properly, never enforced rate limits. Name those concerns explicitly.
- **Tech stack is one decision, not many.** Bundle stack decisions: "Move to TypeScript+Next.js?" not "TypeScript? Next.js? Tailwind? React Query? Prisma?"

---

## The refinement passes

The AI runs five passes through the extracted spec, in this order:

### Pass 1 — Feature triage

For each feature/use-case in the extracted spec, propose a disposition:

> Found these features in the source system:
> 1. [Feature] — Active, used in production. **Default: keep.**
> 2. [Feature] — Active but no recent commits. **Default: keep but flag for review.**
> 3. [Feature] — Code present but no test coverage and no recent activity. **Default: drop unless you say keep.**
> 4. [Feature] — Documented but not implemented (orphan). **Default: drop.**

Ask the user to override any defaults. Do not make them re-confirm the defaults.

### Pass 2 — Tech stack decision

Bundle the stack decisions. Propose one or two coherent stacks based on the source system shape and the user's stated migration target:

> Recommended target stack: [stack-A] (well-supported by AI generation, mature ecosystem for this use case)
> Alternative: [stack-B] (specific reason this might be better)
>
> Pick A, B, or specify your own.

### Pass 3 — NFR additions

Surface non-functional concerns the source system lacks:

> The source system does not appear to have:
> - Structured logging (only `console.log` / `print` calls)
> - Rate limiting on public endpoints
> - Encryption at rest for [specific data]
> - Audit trail for [specific actions]
>
> For each, recommend: add to spec, defer, or skip. Most teams add 1-3 in a migration; adding all of them at once over-scopes the migration. Pick what matters for your context.

### Pass 4 — Modernization opportunities

Surface specific modernization choices that materially improve maintainability:

> Modernization candidates:
> - Switch from polling to WebSocket / SSE where the source uses polling
> - Replace homegrown queue with [appropriate managed solution]
> - Add OpenAPI spec where the source has REST without contracts
>
> Each of these is optional. Recommend by impact-vs-effort.

### Pass 5 — What stays the same

Confirm explicitly what is preserved across the migration:

> Things I will preserve unchanged from the source:
> - Public API contracts (so existing clients keep working)
> - Database schema for [tables] (data carries over)
> - Business logic for [domain area] (regulated, do not touch)
>
> Anything else you want me to mark as "do not touch"?

---

## After the refinement conversation

The AI produces a **refined spec** that combines:

- The extracted source-system behavior (filtered through the user's keep/drop/modernize decisions)
- The chosen target tech stack
- The added NFRs
- The modernization changes
- The explicit "preserve as-is" list

Then `pragmaworks_bootstrap_project` is called with the refined spec instead of a fresh idea. The greenfield generation proceeds in the empty target folder using the refined spec as input. The user does not need to handwrite anything.

## What gets written where

- `<target-folder>/docs/specs/migration-context.md` — captures the source system's relevant context (so the AI has enough information to generate)
- `<target-folder>/docs/specs/spec.md` — the refined spec, ready for greenfield bootstrap
- `<target-folder>/docs/adrs/0001-migration-decisions.md` — records the keep/drop/modernize decisions with rationale
- `<source-repo>/pragmaworks/migration-<timestamp>/audit.json` — the original audit that initiated the migration

## When NOT to use this prompt

- The user wants a literal port (preserve every wart). Then skip the refinement entirely; bootstrap directly from the extracted spec without modification.
- The migration is just a tech-stack change with no scope changes. Then only run pass 2 (tech stack decision) and skip the rest.
- The migration is a takeover (consultant adopting an unknown codebase). Then this is not a migration at all — it's an onboarding flow with team-habit analysis. Use `pragmaworks_onboard_developer` with `includeTeamHabits: true`.
