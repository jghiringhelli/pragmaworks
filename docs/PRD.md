# gs-onboardkit

## Problem

Three tools. Three installs. Three separate invocations. A new developer joining a
GS-governed project, or a returning developer after two months away, has to manually
check ForgeCraft gate status, run a CodeSeeker module query, and recall Chronicle
architectural memories before they can work effectively.

In practice, they skip all of it and ask someone — or start coding without context.

## Users

- **New developer onboarding** — joining a GS-governed project for the first time
- **Returning developer** — back after weeks away; needs to know what changed
- **AI assistant at session start** — reads `.onboardkit/context.md` as its first context load
- **Tech lead** — validates that the context package covers the domain correctly

## Success Criteria

- `onboard` completes in < 30 seconds on a project with all three peer tools installed
- Context package is coherent — no duplicate information, logical reading order
- `refresh` correctly identifies what changed since the last run
- Works when any one of the three peer tools is missing (graceful degradation with clear install hints)
- Distributed as `gs-onboardkit` on npm, installable in < 1 minute

## Components

- **MCP server** (`src/index.ts`) — exposes three tools: `onboard`, `refresh`, `status`
- **Assembler** (`src/assembler.ts`) — orchestrates concurrent calls to all three peer tools
- **ForgeCraft adapter** (`src/forgecraft.ts`) — gate status + spec gap extraction
- **CodeSeeker adapter** (`src/codeseeker.ts`) — module map for the focus area
- **Chronicle adapter** (`src/chronicle.ts`) — architectural memories relevant to role/task
- **Renderer** (`src/renderer.ts`) — assembles structured data into the context package markdown
- **Questions** (`src/questions.ts`) — input schemas for all three MCP tools

## External Systems

- **ForgeCraft MCP** (`forgecraft-mcp` on npm) — GS gate status, verify score, cascade check
- **CodeSeeker MCP** (`codeseeker` on npm) — semantic code search, module map
- **Chronicle MCP** (`chronicle-mcp` on npm) — architectural memory store (recall)
