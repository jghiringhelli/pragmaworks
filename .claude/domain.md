# gs-onboardkit — Domain Knowledge

> Load when: implementing the MCP tools, the three-question flow, the assembler, or the context renderer.

## Domain Glossary

| Term | Definition |
|------|-----------|
| Context package | Assembled output: relevant ForgeCraft blocks + CodeSeeker module summary + Chronicle architectural memories |
| Role | One of: developer, tech-lead, reviewer, onboarding. Shapes which context is prioritized. |
| Focus area | The module or feature the person is working on. Scopes the CodeSeeker query. |
| First task | What they're about to do. Selects relevant Chronicle memories and ForgeCraft gate status. |
| Cold start | First run in a project — all three tools queried fresh, output written to `.onboardkit/context.md` |
| Warm start | Subsequent run — reads `.onboardkit/context.md`, diffs against current state, updates only what changed. |

## Architecture

```
src/
  index.ts              ← MCP server entry (3 tools: onboard, refresh, status)
  questions.ts          ← three-question flow (role, focus, task)
  assembler.ts          ← calls ForgeCraft + CodeSeeker + Chronicle, merges results
  forgecraft.ts         ← query open blocks, gate status, current score
  codeseeker.ts         ← query module map for focus area
  chronicle.ts          ← query architectural memories relevant to role/task
  renderer.ts           ← render context package as markdown
.onboardkit/
  context.md            ← output: assembled day-one context (committed to repo)
```

## MCP Tools Exposed

| Tool | Description |
|------|-------------|
| `onboard` | Full context package assembly. Three-question flow. Writes `.onboardkit/context.md`. |
| `refresh` | Re-runs assembly, updates context.md with current state. |
| `status` | Shows staleness: when context was last built, what has changed since. |

## Key Constraints

- Requires all three peer tools (ForgeCraft, CodeSeeker, Chronicle) — degrades gracefully if one missing
- Output is a committed file — `.onboardkit/context.md` is the artifact, not transient output
- Never stores secrets — context package contains architectural knowledge only
- MCP SDK v1 — same pattern as ForgeCraft, CodeSeeker, Chronicle
- Distributed as `gs-onboardkit` on npm
