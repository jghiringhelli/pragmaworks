# Use Cases — gs-onboardkit

## UC-001: New Developer Onboarding (Cold Start)

**Actor**: Developer joining a GS-governed project for the first time
**Precondition**: Project has at least one of: ForgeCraft, CodeSeeker, Chronicle installed
**Steps**:
1. Developer calls the `onboard` MCP tool with `project_dir`, `role`, `focus_area`, `first_task`
2. gs-onboardkit concurrently queries ForgeCraft (gate status + spec gaps), CodeSeeker (module map), Chronicle (architectural decisions)
3. gs-onboardkit assembles results into a structured markdown context package
4. gs-onboardkit writes the package to `.onboardkit/context.md` in the project root
5. Developer (or AI assistant) reads `.onboardkit/context.md` to orient before starting work
**Postcondition**: `.onboardkit/context.md` exists, contains a coherent context package scoped to the developer's role, focus area, and first task.
**Error paths**: If any peer tool is unavailable, that section is replaced with a note explaining what's missing and how to install it. Other sections are not affected.

## UC-002: Returning Developer Refresh (Warm Start)

**Actor**: Developer returning to a project after ≥ 1 week away
**Precondition**: `.onboardkit/context.md` already exists from a previous `onboard` run
**Steps**:
1. Developer calls the `refresh` MCP tool with `project_dir` (and optionally new `role`, `focus_area`, `first_task`)
2. gs-onboardkit reads the previous context metadata (role, focus area, task) from the existing file
3. gs-onboardkit re-runs all three peer tool queries with the current project state
4. gs-onboardkit overwrites `.onboardkit/context.md` with the updated context package
**Postcondition**: `.onboardkit/context.md` is updated to reflect the current state — new ADRs, new gate failures, new modules. The previous file is replaced.
**Error paths**: If role/focus/task cannot be parsed from the existing file and no overrides are provided, the tool returns an error asking the developer to run `onboard` instead.

## UC-003: Staleness Check

**Actor**: Developer or AI assistant
**Precondition**: None (works whether or not context.md exists)
**Steps**:
1. Actor calls the `status` MCP tool with `project_dir`
2. gs-onboardkit reads the file modification time and the `_Generated:` header from context.md
3. gs-onboardkit returns the age of the context package and the last session metadata
**Postcondition**: Actor knows when the context was last generated, whether it's stale (> 7 days), and what role/focus/task it was built for.
**Error paths**: If context.md does not exist, the tool returns a prompt to run `onboard`.

## UC-004: Graceful Degradation

**Actor**: Developer on a project that only has one or two peer tools installed
**Precondition**: At least one of ForgeCraft, CodeSeeker, Chronicle is missing
**Steps**:
1. Developer calls `onboard` or `refresh`
2. gs-onboardkit attempts to connect to all three peer tools concurrently
3. Missing tools fail with a connection error (spawn fails or timeout)
4. Available tools respond normally
5. gs-onboardkit assembles a partial context package, with unavailable sections replaced by clear notes
6. The `## Missing Tools` section lists what's missing and how to install each tool
**Postcondition**: `.onboardkit/context.md` is written with partial content. The developer is not blocked, but knows which sections are incomplete and how to complete them.
