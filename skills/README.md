# PragmaWorks Skills

Generative Specification skills for AI coding agents — the routing/orientation layer above `pragmaworks` MCP. Each skill is a thin `SKILL.md` that tells the agent **when** to use a flow and **what gates** to honor; the substantive work happens inside `pragmaworks_*` MCP tools.

## The skills

**Meta** — orients and routes:

| Skill | Use when |
|---|---|
| [`using-gs-skills`](using-gs-skills/SKILL.md) | Starting a session in a GS-bearing project; routes to the right anchor |

**Entry points** (user-initiated — where work begins):

| Skill | Use when |
|---|---|
| [`gs-bootstrap`](gs-bootstrap/SKILL.md) | Greenfield — empty folder, new idea |
| [`gs-audit`](gs-audit/SKILL.md) | Brownfield — existing repo, score it |
| [`gs-remediate`](gs-remediate/SKILL.md) | Act on audit findings — generate and apply DP-XXX prompts |
| [`gs-migrate`](gs-migrate/SKILL.md) | Move existing system to a new stack |
| [`gs-onboard`](gs-onboard/SKILL.md) | Brief a developer joining an existing codebase |

**Enforcement** (context-initiated — auto-fire on trigger phrases / hook events):

| Skill | Tier | Use when |
|---|---|---|
| [`gs-cascade-check`](gs-cascade-check/SKILL.md) | Cross-cutting | Session start, before merge, before deploy, before any structural edit |
| [`gs-verify-deploy`](gs-verify-deploy/SKILL.md) | T2 → T3 | Just deployed; verify the contract end-to-end with hurl + k6 + CLI checks |
| [`gs-monitor-production`](gs-monitor-production/SKILL.md) | T3 | Production incident, drift, p99 breach; convert runtime signals to spec change candidates |
| [`gs-evolve-spec`](gs-evolve-spec/SKILL.md) | T4 | Confirmed spec-change candidate; run the mutation gauntlet before any spec edit |

The skills are agent-agnostic in format — same `SKILL.md` installs as a Claude Code plugin, copies into Cursor's `.cursor/rules/`, registers as Gemini CLI skills, or feeds into Copilot context. See per-agent install notes below.

## Install

### Claude Code

```bash
# Local (development):
git clone https://github.com/jghiringhelli/pragmaworks.git
claude --plugin-dir /path/to/pragmaworks/skills
```

Marketplace install will be available once published.

### Cursor

Copy any `SKILL.md` into `.cursor/rules/`, or reference the full `skills/` directory.

### Gemini CLI

```bash
gemini skills install https://github.com/jghiringhelli/pragmaworks.git --path skills
```

## What lives where

- **`skills/`** (this directory) — routing, orientation, gates, when-to-use guidance
- **`prompts/`** — the structured prompts each skill invokes (bootstrap-clarify, mvp-guide, migration-refinement, onboarding-briefing, judgment-layer-disclaimer, licensing-trigger)
- **`src/`** — the MCP tools that do the actual work (`pragmaworks_*` registered in `src/mcp/server.ts`)
- **[`gs/generative-specification/docs/repository-discipline.md`](../../gs/generative-specification/docs/repository-discipline.md)** — the tool-agnostic mechanical reference for *what* each skill enforces (the pure-GS variant sections of each SKILL.md derive from this single source)

A skill should never duplicate substantive logic that exists in `prompts/` or `src/`. The skill's job is to **point** at the right pragmaworks_* tool with the right framing, and enforce the non-negotiable behaviors (sentinel-aware-write, judgment layer, branch isolation, public-surface diff).

## Convergence note

This directory takes its structural cues from Addy Osmani's [agent-skills](https://github.com/addyosmani/agent-skills) (Google Cloud AI, 2026) — same SKILL.md frontmatter, same multi-host strategy, same "thin routing on top of substantive tools" pattern. We diverge in scope: Osmani's 22 skills are all T1 (the dev cycle). Our pack splits into **entry-point skills** (the five lifecycle entries, all of which begin at T1) and **enforcement skills** (cross-cutting + T2/T3/T4 — the "hard" tiers where the prior paradigm reliably drifts). Where Osmani's `spec-driven-development` skill is closest to ours, our `gs-bootstrap` adds: branch isolation, calibration anchors, the seven-property scoring rubric, and the ADR-sequencing handoff that closes the loop with forgecraft.

The enforcement skills are what make GS distinct in practice. Osmani's skills get you to a clean dev cycle. Our enforcement skills make sure the dev cycle's output survives staging (`gs-verify-deploy`), production (`gs-monitor-production`), and evolution (`gs-evolve-spec`) — and that the cascade between tiers stays coherent (`gs-cascade-check`). Each enforcement skill has a pure-GS variant section: the discipline works without the tooling; the tooling makes the discipline survive operational pressure.
