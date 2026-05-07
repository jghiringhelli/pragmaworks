# ADR 0001 — Suite brand: `pragmaworks` (with `forgecraft` as flagship engine)

*Date: 2026-05-07 · Status: Accepted*

## Context

The PragmaWorks Labs LLC product suite includes:

- An engineering-standards engine published as `forgecraft-mcp`, mature on npm, with established install base and brand identity (ember/forge visual identity, `forgeworkshop.dev` workshop surface).
- A code-intelligence package `codeseeker`, mature on npm, with its own audience and positioning.
- A persistent AI memory package `chronicle-mcp`, on npm, individual-only currently.
- A unified orchestration package (this one), formerly named `gs-onboardkit`, that composes the three above into the cookbook flows on `pragmaworks.dev`.

We need a single, memorable, brand for the unified package and the public-facing product. Two candidates were debated.

### Option A — Brand the suite as `pragmaworks`

- Matches the company name (PragmaWorks Labs LLC).
- Future-proof: the company will ship more products (Loom, Bio Iso, Ambient Engineering as separate concerns), and a company-named umbrella accommodates them naturally.
- Keeps `forgecraft-mcp` as the flagship engine product *underneath* the umbrella; ForgeCraft retains its install base and visual identity for users who already know it.
- Cleaner naming hierarchy: PragmaWorks ships ForgeCraft, CodeSeeker, Chronicle, etc. Mirrors how `npm` is the registry brand and individual packages live under it.

### Option B — Brand the suite as `forgecraft`

- ForgeCraft already has npm visibility, GitHub stars, and mentions. No re-education cost.
- Visual identity is already strong (ember/forge, `forgeworkshop.dev`).
- Drawback: locks the company brand to one product family. When Loom or Bio Iso ships, the relationship between forgecraft-the-suite and Loom-the-language is awkward.

## Decision

**Adopt Option A.** The suite-level brand is `pragmaworks`. The flagship engineering-standards engine remains `forgecraft-mcp` and retains its own brand under the umbrella.

The public command becomes `npx pragmaworks audit` (the cookbook prompt). The MCP package is `pragmaworks` (this repo). The website is `pragmaworks.dev`. The ember/forge visual identity is preserved across the unified marketing surface (favicon, design system).

## Consequences

- All cookbook prompts and public surfaces refer to `pragmaworks` as the install target.
- `forgecraft-mcp` keeps its npm name unchanged; users who already know it are unaffected.
- The relationship is documented in the README composition diagram: `pragmaworks` library-composes `forgecraft-mcp` + `codeseeker` + `chronicle-mcp`.
- Future products (Loom, Bio Iso, Ambient) sit at peer level to the cookbook product; each can have its own brand surface under PragmaWorks Labs.
- Existing `gs-onboardkit` users (none in production yet) migrate by installing `pragmaworks` instead.

## Alternatives considered

- A brand-new third name: rejected because we'd be introducing yet another identity for users to learn.
- Keeping `gs-onboardkit` as the unified name: rejected because "GS" is the academic/discipline name and "onboardkit" no longer describes the broader scope.
