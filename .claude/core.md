# gs-onboardkit — Core

> Always loaded. Contains only what is true across all domains.
> Hard limit: 50 lines. If it grows, move the excess to a domain node.

## Domain Identity
Three tools. Three installs. Three separate invocations. A new developer joining a GS-governed project, or a returning developer after two months away, has to manually check ForgeCraft gate status, ru

## Tags
[UNIVERSAL] [DOCS] [MCP] [TYPESCRIPT] [ORCHESTRATOR] [API]

## Primary Entities
- A new developer joining
a GS-governed project, or a returning developer after two months away, has to
manually check ForgeCraft gate status, run a CodeSeeker module query, and recall
Chronicle architectural memories before they can work effectively.
- I receive a context document that tells me the open spec gaps,
the module structure of the area I'll work in, and the architectural decisions
that explain why things are the way they are.
- The
context document updates to show what changed since my last session — new ADRs,
new modules, new memories.
- ## Context Package Format

```markdown
# Onboarding Context — [Project Name]
_Generated: [date] · Role: developer · Focus: auth module · Task: add OAuth provider_

## Open Specification Gaps (ForgeCraft)
- use-cases.md: UC-12 (OAuth callback) missing postcondition
- ADR-007: decision recorded but rationale field empty

## Module Map — auth (CodeSeeker)
- src/auth/: OAuthProvider, SessionManager, TokenStore
- Depends on: src/db/ (UserRepository), src/config/ (EnvConfig)
- Depended on by: src/api/routes/auth.ts, src/middleware/session.ts

## Architectural Decisions (Chronicle)
- ADR-003: JWT over sessions — chosen for stateless scaling, reviewed 2026-03-12
- ADR-007: GitHub OAuth as primary — email/password deferred, no timeline

## Gate Status (ForgeCraft)
- Current score: 11/14
- Failing: Auditable (ADR-007 incomplete), Executable (use-cases.md gap)
```

## Success Criteria

- `onboard` completes in < 30 seconds on a project with all three tools
- Context package is coherent — no duplicate information, logical reading order
- `refresh` correctly identifies what changed since last run
- Works when any one of the three peer tools is missing (graceful degradation)
- Distributed as a standalone npm package, installed in < 1 minute

## Layer Map
```
[API/CLI] → [Services] → [Domain] → [Repositories] → [Infrastructure]
Dependencies point inward. Domain has zero external imports.
```

## Invariants
- Every public function has a JSDoc with typed params and returns
- No circular imports (enforced by pre-commit hook)
- Test coverage ≥80% on all changed files