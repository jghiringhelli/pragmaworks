---
name: gs-verify-deploy
description: Verifies a deployment is actually working by exercising it through its public contract — CLI, HTTP, API. Use immediately after any deploy/release/ship/push-to-production action, or when the user says "is it working?", "did the deploy go through?", or "smoke test this". Reads the spec's NFR contract and use-case postconditions, then exercises them against the live deployment with hurl/k6/curl-equivalent tools. Surfaces failures as DP-XXX prompts the user can act on. Do not invoke for local-dev verification — this is for the T2→T3 transition only.
---

# GS Verify Deploy (T2 → T3 Transition)

## Overview

A deployment that compiles, builds, and shows green CI is not a working deployment. T2 → T3 is the moment that distinction matters: the code is in an environment with real network, real auth, real timeouts, real data. The verify-deploy skill exercises the public contract end-to-end against the actual deployed artifact and surfaces violations before they become production incidents.

The discipline this enforces is the one the prior paradigm reliably fails: **the deployment was declared done before the contract was verified.** Skill auto-fires on deploy-shaped context so the AI cannot quietly skip it.

## When to Use

- The AI just shipped a deploy (any of: `git push`, `railway up`, `vercel`, `gh release create`, `npm publish`, `kubectl apply`, `terraform apply`, `flyctl deploy`)
- The user says "deployed", "shipped", "release went out", "is it live?"
- A migration just bootstrapped a target stack and you're about to declare it done
- An ADR introduced a new external dependency (API, DB, message bus) — verify reachability under the contract

**When NOT to use:**

- Local-dev runs (`npm run dev`, `cargo run`) — that's T1 unit/integration tests
- The user explicitly says "skip verification, I'll test it manually" — surface the risk and proceed
- Pre-deploy dry-runs — verification is **after** the deployment is reachable

## The Process

### Phase 1 — Locate the contract

Three sources, in priority order:

1. **`docs/specs/spec.md` NFR section** — performance SLOs, response time bounds, throughput, rate limits
2. **`docs/specs/use-cases.md` postconditions** — what must be true after a successful invocation
3. **OpenAPI / JSON Schema in `docs/specs/`** — request/response shapes, error codes, auth contracts

If none exist, the deploy is unverifiable. Surface that to the user: "There's no spec for what 'working' means; we can hit endpoints but we can't grade success. Want to write a quick NFR contract first?"

### Phase 2 — Set up or refresh the harness

Call `pragmaworks_setup_harness` against the deployed target URL. The MCP tool will:

1. Derive harness specs from `docs/specs/` (or update existing ones if they're stale)
2. Generate hurl files for HTTP contract verification (auth flows, happy-path endpoints, error-shape contracts)
3. Generate k6 scripts for SLO-ramp testing (response time, throughput against the NFR contract)
4. Generate CLI smoke tests where the deployment exposes a CLI surface

### Phase 3 — Run the harness against the live deployment

Run hurl, then k6, then any CLI checks. The order matters — failing hurl means broken contract, not a load problem; failing k6 means contract is fine but performance is wrong. Capture all output to `pragmaworks/verify-<timestamp>/results.json`.

Three outcomes:
- **All green** → deploy is verified; record `verified: true` in Chronicle as an architectural memory entry tagged `t2-passed`
- **Contract failures (hurl red)** → surface each as a DP-XXX prompt; the spec said X, the deployment delivers Y, here's what changed
- **SLO failures (k6 red, hurl green)** → deployment is functionally correct but breaches the NFR contract; surface as DP-XXX for either spec adjustment or performance work

### Phase 4 — Either close the loop or feed back to T1

If verified: declare the deploy done and let the production-monitoring skill (`gs-monitor-production`) take over.

If not verified: do NOT silently retry. Surface the failures, route to the relevant T1 skill (`gs-remediate` for code, `gs-bootstrap` for spec) with the verify-deploy results as input. The rollback decision is human judgment.

## Pure-GS Variant (No PragmaWorks)

If pragmaworks isn't installed, the manual variant is:

1. Read `docs/specs/spec.md` NFR + `docs/specs/use-cases.md` postconditions
2. Write hurl files by hand mapping use cases → HTTP calls
3. Write a k6 script for the slowest known endpoint at 2x expected peak load
4. Run them; record results in a commit message under conventional-commit `verify(deploy)`

This is what the skill enforces — discipline above tooling. The tooling makes it cheaper.

## Tier Context

T2 verification half. T2 authoring half is "deployment-as-spec" — the deployment scripts derived from the spec. This skill verifies those scripts produced what they claimed.

## Hook Integration

In a forgecraft-governed repo, this skill should be triggered by a post-deploy hook (`.claude/hooks/post-deploy.sh`). The hook fires the skill automatically; the skill's first job is to surface assumptions about what was just deployed and where, so the user can correct before the harness runs.
