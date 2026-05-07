# ADR 0002 — Library composition over subprocess composition

*Date: 2026-05-07 · Status: Accepted*

## Context

`pragmaworks` orchestrates three underlying tools: `forgecraft-mcp`, `codeseeker`, `chronicle-mcp`. There are four ways an MCP-style tool can compose other tools (per `soma/docs/PRAGMAWORKS-PLAYBOOK.md` §7):

1. **Library composition** — depend on the others as runtime npm packages, import their library exports, call them directly.
2. **Subprocess composition** — shell out to each tool's CLI (`npx codeseeker search ...`).
3. **Multiple MCPs installed separately** — user installs each as a separate MCP; AI orchestrates between them.
4. **AI as orchestrator** — user asks the AI to run multiple tools in sequence; no infrastructure.

## Decision

**Adopt library composition (Option 1) as the primary model. Multiple MCPs installed separately (Option 3) remains available for power users who want fine-grained access.**

The package declares forgecraft-mcp, codeseeker, and chronicle-mcp as runtime dependencies in `package.json`. Adapters in `src/adapters/` import their library exports and call them directly.

## Rationale

- **Single MCP install for buyers.** The default install path (`pragmaworks` in `.mcp.json`) gives the AI assistant ~9 high-level tools. The alternative (separate MCPs) bloats the AI's tool roster to 30+ low-level tools and consumes 3000-5000 tokens per session of context budget.
- **Updates propagate via npm.** When ForgeCraft v1.6 ships, `pragmaworks` users get it via `npm update` — no coordinated release required.
- **No subprocess overhead.** Subprocess composition adds ~200-500ms per call. Library composition is in-process. For an audit that may make 50+ tool calls, this matters.
- **Consistent error handling.** Adapter pattern lets us handle missing/failing underlying tools uniformly with graceful degradation.
- **Power users not blocked.** Users who already install ForgeCraft / CodeSeeker / Chronicle as separate MCPs can keep doing that; `pragmaworks` is additive, not replacement.

## Consequences

- All three underlying tools must export library APIs (in addition to their MCP servers). `forgecraft-mcp` v1.5 already does. `codeseeker` and `chronicle-mcp` need confirmation/extension — see prompts in `soma/docs/PRAGMAWORKS-PLAYBOOK.md`.
- Major-version bumps of underlying tools require a `pragmaworks` major bump and re-test against new APIs.
- `package.json` bundle size grows because the underlying tools are pulled in at install time. Acceptable tradeoff — disk is cheap, AI context tokens are not.

## Alternatives considered

- **Subprocess composition** rejected for performance and error-handling reasons above.
- **Multiple MCPs only (no unified package)** rejected because it's the buyer-facing experience we're explicitly improving — one install, one URL, one report.
- **AI as orchestrator only** rejected because it relies on user knowing the multi-tool flow; the cookbook's promise is "one prompt, AI does the work."
