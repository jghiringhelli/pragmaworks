---
name: gs-verify-deploy
description: Verifies a deployment is actually working by exercising it through its public contract — CLI, HTTP, API. Use immediately after any deploy/release/ship/push-to-production action, or when the user says "is it working?", "did the deploy go through?", or "smoke test this". Reads the spec's NFR contract and use-case postconditions, then exercises them against the live deployment with hurl/k6/curl-equivalent tools. Surfaces failures as DP-XXX prompts the user can act on. Do not invoke for local-dev verification — this is for the T2→T3 transition only.
---

# GS Verify Deploy (T2 → T3 Transition)

## Overview

A deployment that compiles, builds, and shows green CI is not a working deployment. T2 → T3 is the moment that distinction matters: the code is in an environment with real network, real auth, real timeouts, real data. The verify-deploy skill exercises the public contract end-to-end against the actual deployed artifact and surfaces violations before they become production incidents.

The discipline this enforces is the one the prior paradigm reliably fails: **the deployment was declared done before the contract was verified.** Skill auto-fires on deploy-shaped context so the AI cannot quietly skip it.

> **Naming.** This skill is the **generative execution** (*ejecución generativa*) loop applied at the T2→T3 transition: exercising the running system through its contract across independent signals — the *multimodal verification loop*, not "run the tests" and not a single Playwright e2e. Same loop, deploy-time instance. Convention: `soma/docs/method/convenciones-asistente.md`.

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
5. Generate the **use-case walk** — one driver per UC-/F-NNN that exercises the full multimodal verification loop (below), not just the HTTP contract

### The Verification Loop — multimodal AI-as-QA

Contract + load (hurl + k6) proves the boundary and the SLOs. It does **not** prove a use case actually works end-to-end. For that, the walk triangulates evidence across every layer the use case touches and checks they **cohere**. Canonical loop for a create/update use case:

1. **Prior state** — SQL / DB MCP: capture DB state before the action
2. **Behavior** — Playwright MCP: drive the user flow in a real browser (mobile-automation MCP for mobile; hurl for headless/API)
3. **Business layer** — read logs/traces: confirm the business layer received and processed the right command and values
4. **New state** — SQL again: capture the delta — exactly the right rows changed, nothing else
5. **Return** — UI refresh, Playwright screenshot + vision check against the use-case postcondition
6. **Coherence** — UI, logs, and DB must tell the same story. Screen says "saved" but DB delta empty, or logs show a value the UI never displayed → **fail, even if each isolated check passes**

Evidence layers → tools: state = SQL/DB MCP · behavior+visual = Playwright MCP+vision · API/contract = hurl · business internals = log/trace reading · SLO/load = k6 · statistical/balance = parameterized simulation.

**Patterns (one principle, swapped per shape):** headless (no UI — hurl+SQL+logs) · mobile (mobile MCP) · simulation/optimization/balance (parameterized run, statistical verification) · ETL/data pipeline (trace a datum source→transform stages→aggregated sink; verify lineage + coherence) · event-driven/async (publish→consume→effect across broker+consumer logs+state; account for eventual consistency, idempotency, retries). New shape → map its evidence layers to tools, check coherence.

### Phase 3 — Run the harness against the live deployment

Run in evidence order: **hurl** (contract) → **use-case walk** (multimodal loop, with coherence) → **k6** (SLO/load). The order matters — failing hurl means broken contract; failing the walk means the use case doesn't actually work (or the layers don't cohere); failing k6 means it works but breaches the NFR contract. Capture all output to `pragmaworks/verify-<timestamp>/results.json`.

What the pass proves: **Executable** (the use cases actually run against the deployed artifact) + **Verifiable** (every NFR threshold and postcondition checked against the spec, by the harness). NFR battery + generative execution = those two properties, demonstrated at production fidelity.

Outcomes:
- **All green** → deploy is verified; record `verified: true` in Chronicle as an architectural memory entry tagged `t2-passed`
- **Contract failures (hurl red)** → surface each as a DP-XXX prompt; the spec said X, the deployment delivers Y, here's what changed
- **Use-case-walk failures (incl. incoherence)** → surface the use case + the layers that disagree; this is a functional break even when hurl is green
- **SLO failures (k6 red, walk green)** → functionally correct but breaches the NFR contract; surface as DP-XXX for spec adjustment or performance work

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

## Hook Integration & the Promotion Gate

In a forgecraft-governed repo, this skill is the enforcement body of the **Tier 2 promotion gate** (`docs/specs/t2-promotion-gate.md`). Two forcing levels:

1. **Behavioral (always on):** a post-deploy hook (`.claude/hooks/post-deploy.sh`) auto-fires the skill on deploy-shaped context so the AI cannot quietly skip it. The skill's first job is to surface assumptions about what was deployed and where, so the user can correct before the harness runs.
2. **Hard gate (CI/CD):** in the pipeline, the skill runs after deploy-to-staging and **exits nonzero on any failure** (contract, use-case walk including incoherence, or SLO). The pipeline's promotion step is gated on that exit code — nothing promotes to the next environment without a green walk. This is the Tier 2 analog of Tier 1's pre-commit cascade hook: the gate is mechanical, not a reminder.

The gate is **declared at Mold** (the NFR thresholds and the rule "every use case passes the walk" live in SPEC.md and the gate policy from the moment you mold) and its **body is built here at Harden** (the hurl files, Playwright walk, and wiring to real endpoints can only be generated once the code exists). Declared once; made executable as the system does.
