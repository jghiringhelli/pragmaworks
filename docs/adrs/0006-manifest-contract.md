# ADR 0006 — Adopt forgecraft's canonical doc-manifest as the integration contract

*Date: 2026-05-08 · Status: Accepted*

## Context

Pragmaworks orchestrates three independent runtime tools — `forgecraft-mcp` (project layer: specs, ADRs, hooks, gates), `chronicle-mcp` (individual layer: per-developer AI memory), and `chronicle-team` (team layer: shared memory, prompt analytics, workload split). Each cookbook flow (greenfield bootstrap, brownfield audit, remediation, migration, onboarding, team-habit analysis, after-report) must coordinate work across two or three of those layers without producing tight coupling between them.

The earlier integration sketch wired these tools together with shared TypeScript types and direct cross-package imports. That coupled their release cadence: a chronicle change to its memory schema forced a forgecraft and pragmaworks bump in the same PR. It also meant a team adopting GS without one of the tools (e.g., a solo developer not running chronicle-team) inherited dead code paths and ambient assumptions.

ForgeCraft v1.6.0 ships a canonical document-manifest schema at `forgecraft-mcp/templates/docs-manifest.yaml`. The schema declares document types (specs, ADRs, use-cases, roadmaps, schemas, decisions, contracts, session-prompts), cascade rules per commit type (which docs must touch on `feat:` vs `fix:`), public-API-surface detection rules, the human-judgment gate configuration, and a `recording:` block documenting which tool owns which layer. Each project writes its own `docs/manifest.yaml` referencing that canonical schema and overriding paths/severities for legacy layouts.

We need to choose what binds the three tools together when pragmaworks orchestrates them.

## Decision

**Adopt the forgecraft canonical doc-manifest schema as the only required integration contract between pragmaworks, forgecraft, chronicle, and chronicle-team.** No SDK-level coupling. Each tool reads `docs/manifest.yaml` directly and stays in its lane:

- Forgecraft reads the `documents:`, `cascade:`, `api_surface:`, `human_judgment:` blocks to drive hooks, gates, and CI.
- Chronicle reads the `documents:` block to decide which files to surface at session start, and the `recording.individual` block to scope its memory store.
- Chronicle-team reads the `documents:` block for ticket-to-spec mapping and the `recording.team` block to scope its dashboard.
- Pragmaworks reads everything: it inspects the manifest at the start of every cookbook flow, generates one (with `overrides:` entries for non-canonical paths) when the target repo lacks one, and routes work to the appropriate adapter based on which layer the operation touches.

The manifest is referenced by `schema_source: forgecraft@<version>/templates/docs-manifest.yaml` rather than vendored. Schema updates flow through normal npm dependency bumps.

## Rationale

- **Decoupled releases.** Forgecraft, chronicle, chronicle-team, and pragmaworks each release on their own cadence. As long as the manifest schema stays backward-compatible (additive fields, deprecation rather than removal), any one tool can update without forcing the others.
- **Method-first, tool-second.** The GS cookbook (`forgecraft/docs/specs/pragmaworks-gs-cookbook.md` §1, §4) explicitly supports a "no tools" adoption path: a team can run GS discipline with bash hooks and a hand-written manifest. Picking the manifest as the contract preserves that — the tooling makes it ergonomic; the method works without it. SDK-level coupling would have foreclosed this.
- **Brownfield ergonomics.** The override mechanism in the schema (`legacy_files`, `legacy_dirs`, full-path replacement) means a brownfield repo passes cascade gates on day one with whatever directory layout it already uses. Pragmaworks generates the override block during the audit; the team migrates at its own pace.
- **Dogfooding.** Pragmaworks itself uses the same contract — its own `docs/manifest.yaml` references the canonical schema. We exercise the same surface customers do.
- **Forgecraft is upstream of the schema by design.** Forgecraft owns the project-layer machinery (hooks, gates, the cascade); the schema is its native artifact. Locating the canonical schema there (rather than in pragmaworks or in a fourth standalone package) avoids inventing new ownership.

## Consequences

- **Pragmaworks never imports forgecraft/chronicle/chronicle-team types across the layer boundary.** Adapters in `src/adapters/` import each tool's library exports for the operations they own; they do not pass each other's types around.
- **Manifest authoring becomes a hard contract.** When pragmaworks runs against a target repo without `docs/manifest.yaml`, it generates one and tells the user (see `docs/specs/spec.md` §6, "Manifest authoring"). Silent writes are forbidden.
- **Cascade enforcement is delegated.** Pragmaworks does not implement its own cascade hooks. It calls `forgecraft setup-hooks` to install them. Severity decisions live in the manifest, not in pragmaworks code.
- **Schema version drift is a real risk.** If forgecraft ships v2 of the schema with breaking changes, pragmaworks must support both versions during the migration window. Mitigation: forgecraft is committed to additive evolution; the `version:` field at the top of the schema lets us branch on it if we ever need to.
- **The manifest must stay self-documenting.** Customers reading `docs/manifest.yaml` should understand it without our docs in their hand. The canonical schema's inline comments are part of the contract; we lobby forgecraft to keep them comprehensive.
- **Public-surface diff rule lives in one place.** The `api_surface:` block in the manifest defines what "public surface" means for the project. Pragmaworks doesn't redefine it; it reads the block.

## Alternatives considered

- **SDK-level coupling (shared TypeScript types, direct cross-package imports).** Rejected. Couples release cadence and forecloses the tool-agnostic adoption path. Originally sketched and dropped.
- **A pragmaworks-owned integration schema (separate from forgecraft's).** Rejected. Two schemas to keep in sync; contradicts forgecraft's role as upstream of the project layer; would have forced customers to learn two manifests.
- **Implicit contract via filesystem conventions only (no schema).** Rejected. Convention drifts when there's no machine-checkable spec. Brownfield projects with non-canonical layouts had no way to declare their mapping. The override mechanism in the manifest schema is the answer to exactly this case.
- **A single mono-repo bundling all four tools.** Rejected. Each tool has independent customers (chronicle is useful standalone; forgecraft is useful standalone). The wedge depends on each being adoptable on its own.
- **REST-style integration API exposed by forgecraft.** Rejected. Adds a service surface where a YAML file suffices. The cookbook's "no tools" adoption path becomes impossible if the contract requires running a service.

## References

- Source-of-truth implementation report: `C:/workspace/PragmaWorks/forge/forgecraft-mcp/docs/specs/pragmaworks-gs-cookbook.md`
- Canonical schema: `C:/workspace/PragmaWorks/forge/forgecraft-mcp/templates/docs-manifest.yaml`
- Three-layer recording architecture: `docs/specs/architecture.md` §10
- Hard contracts (Manifest authoring, Cascade enforcement, Public-surface diff rule): `docs/specs/spec.md` §6
- Composition decision (library vs vendoring): ADR 0002
