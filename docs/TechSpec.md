# Tech Spec: gs-onboardkit

## Overview

gs-onboardkit is a Node.js MCP server written in TypeScript that orchestrates three
peer MCP tools (ForgeCraft, CodeSeeker, Chronicle) to produce a day-one context package
for developers joining or returning to a GS-governed project. It spawns each peer tool
as a child MCP server via stdio, calls them concurrently, and renders their results into
a structured markdown file (`.onboardkit/context.md`).

## Architecture

### System Diagram

```
[AI Assistant / Claude Code]
         │
         │ MCP stdio
         ▼
  [gs-onboardkit MCP server]
         │
    ┌────┼────┐
    │    │    │  child process MCP stdio
    ▼    ▼    ▼
[FC] [CS] [Ch]    ForgeCraft / CodeSeeker / Chronicle
```

### Tech Stack

- Runtime: Node.js ≥ 20, TypeScript 5.7
- Framework: `@modelcontextprotocol/sdk` v1 (same as all three peer tools)
- Build: `tsc` with `module: Node16`
- Test: vitest v3, 80% line coverage required
- Distribution: npm package `gs-onboardkit`

### Data Flow

1. AI assistant invokes the `onboard` MCP tool with `project_dir`, `role`, `focus_area`, `first_task`
2. `index.ts` delegates to `assembler.ts#assemble()`
3. `assembler.ts` fans out concurrently: `forgecraft.ts`, `codeseeker.ts`, `chronicle.ts`
4. Each adapter spawns the peer tool via `StdioClientTransport`, calls the relevant tool action, parses text/JSON output, and returns a typed result struct
5. `assembler.ts` merges the three results into `AssembledContext`
6. `renderer.ts#render()` converts `AssembledContext` into the context package markdown
7. `index.ts` writes markdown to `.onboardkit/context.md` and returns a summary to the caller

### Concurrency & Timeouts

All three peer tool calls execute via `Promise.all` with a 20-second per-call timeout.
If any call times out or fails, the corresponding data structure has `available: false`
and the error message is embedded in the rendered output under `## Missing Tools`.

## API Contracts

### `onboard` tool

Input:
```json
{
  "project_dir": "/absolute/path/to/project",
  "role": "developer | tech-lead | reviewer | onboarding",
  "focus_area": "auth",
  "first_task": "add OAuth provider"
}
```

Output: text containing a summary line + the full rendered context.md markdown.
Side effect: writes `.onboardkit/context.md`.

### `refresh` tool

Input:
```json
{
  "project_dir": "/absolute/path/to/project",
  "role": "(optional override)",
  "focus_area": "(optional override)",
  "first_task": "(optional override)"
}
```

Output: same format as `onboard`. Role/focus/task read from existing context.md if not provided.

### `status` tool

Input:
```json
{ "project_dir": "/absolute/path/to/project" }
```

Output: staleness report with last generated date, age, and session metadata.

## Security & Compliance

- Never stores secrets. `.onboardkit/context.md` contains only architectural knowledge.
- No network calls. All peer tool invocations are local child processes via stdio.
- `project_dir` is passed directly to peer tools — validation is their responsibility.
- No credentials, tokens, or API keys required.

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | ^1.12.1 | MCP server + client |
| `zod` | ^3.24.2 | Input schema validation |
| `typescript` | ^5.7.0 | Build |
| `vitest` | ^3.0.0 | Tests |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Peer tool not installed | H | M | Graceful degradation — skip + note gap |
| Peer tool slow to start | M | M | 20s timeout per tool; concurrent calls limit wall time |
| Peer tool output format changes | M | M | Defensive text parsing; tests cover edge cases |
| Context.md missing .onboardkit dir | L | L | `mkdirSync` with `recursive: true` on write |
