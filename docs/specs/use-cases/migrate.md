# Use Case — Migration

*Implements the developer-cookbook migration path. MCP tool: `pragmaworks_migrate_project`. Three-stage flow: brownfield audit → guided refinement → greenfield bootstrap in a new folder.*

## Actor

A developer or tech lead migrating an existing system to a new stack, platform, or significantly modernized version. The cookbook describes this as: *"You're staring at a migration to a new stack and trying to figure out the safe path."*

## Precondition

- The user has the source system available locally (cloned).
- The user has identified a target folder (empty, or a fresh git repo to migrate into).
- The user has opened their AI assistant.
- `pragmaworks` is installed (or the AI assistant has permission to install it).

## Main flow

### Stage 1 — Audit the source system

1. AI assistant invokes `pragmaworks_migrate_project` with `sourceRepoPath` and `targetFolderPath`.
2. Orchestrator runs `pragmaworks_audit_repo` against the source system in **stack-independent extraction mode** — focuses on what the system *does* rather than what tech stack it uses. Behavioral contracts, data models, integration points, and use cases are extracted; framework-specific implementation details are noted but not preserved as primary spec.
3. Audit JSON is written to `<source-repo>/pragmaworks/migration-<timestamp>/audit.json` on a new branch in the source repo.
4. Orchestrator returns `status: 'audit-complete'` with the path to the extracted spec.

### Stage 2 — Guided refinement

5. AI assistant presents the extracted spec to the user and runs the **migration refinement conversation** (per `prompts/migration-refinement.md`):
   a. Pass 1 — Feature triage: keep/drop/modernize each feature
   b. Pass 2 — Tech stack decision (single bundled choice)
   c. Pass 3 — NFR additions (logging, rate limits, encryption, audit trail)
   d. Pass 4 — Modernization opportunities (polling → WebSocket, homegrown queue → managed, etc.)
   e. Pass 5 — Confirm what stays the same (preserved API contracts, schemas, regulated logic)
6. User answers the prompts. AI assistant collects answers.
7. AI assistant invokes `pragmaworks_migrate_project` again with `refinementAnswers` populated.

### Stage 3 — Bootstrap the target

8. Orchestrator merges the user's refinement answers into the extracted spec to produce a **refined target spec**.
9. Orchestrator delegates to `pragmaworks_bootstrap_project` against the `targetFolderPath` with the refined spec as input.
10. forgecraft adapter sets up the cascade in the target folder (CLAUDE.md, forgecraft.yaml, docs/specs/spec.md, docs/adrs/, etc.) tailored to the chosen target tech stack.
11. AI assistant generates code under the established spec (T1 → T2 cascade — spec/code/harness at T1, deployment at T2).
12. Orchestrator returns `status: 'bootstrapped'` with paths to the generated artifacts.

## Postcondition

- `<source-repo>/pragmaworks/migration-<timestamp>/` contains the migration audit on a branch (committed but not on main).
- `<target-folder>/` contains the new project with:
  - `docs/specs/spec.md` — the refined target spec
  - `docs/specs/migration-context.md` — relevant context from the source system
  - `docs/adrs/0001-migration-decisions.md` — keep/drop/modernize decisions with rationale
  - `CLAUDE.md`, `forgecraft.yaml`, etc.
  - Generated code, tests, deployment scripts
- The source system is unchanged on `main`.
- The user has both repos available for parity testing.

## Failure modes

- **Source system too large to audit in one pass.** If the audit times out or exceeds context, orchestrator scopes by directory. User is prompted to migrate in slices: "Migrate the API service first, then the frontend." Each slice is its own migration flow.
- **Refinement decisions conflict with what the source actually does.** Orchestrator surfaces the conflict during stage 2: "You said drop feature X, but feature Y depends on it. Drop both, keep both, or rethink?" User resolves before bootstrap proceeds.
- **Target tech stack incompatible with source data model.** Orchestrator surfaces in stage 3 before generation: "The chosen target stack doesn't natively support [feature]. Adapt with [workaround], or change target?"
- **Greenfield bootstrap fails on the refined spec.** Same failure modes as bootstrap use case. Spec gaps are surfaced; user fills them; retry.

## Notes

- Migration is the use case where the **judgment layer** is most visible. The keep/drop/modernize decisions are entirely the user's. Pragmaworks surfaces the choices and consequences; it does not decide.
- Migrations are also where Concierge engagements are most valuable. The refinement conversation can be slow and high-stakes. For commercially significant migrations, the Concierge tier handles the conversation as part of the engagement.
- The "literal port" case (preserve every wart) is covered by skipping stage 2 entirely. Document this in the user prompt: *"If you want a literal port, say so — I'll skip the refinement and bootstrap directly from the extracted spec."*

## Out of scope for this use case

- Database migration of actual data (schema migration is in scope; row-by-row data porting is the user's job — pragmaworks generates the migration scripts but does not run them against production)
- DNS / network cutover (operational, outside the audit/spec scope)
- Customer communication about the migration (not pragmaworks's job)
