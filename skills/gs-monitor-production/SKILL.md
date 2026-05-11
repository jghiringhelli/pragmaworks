---
name: gs-monitor-production
description: Reads production runtime signals (logs, exceptions, SLO breaches) and converts them into specification update candidates via the forgecraft-eye signal queue. Use when the user mentions a production incident, drift, anomaly, exception, latency regression, or any "it works in dev but not in prod" symptom. Reads `monitoring-spec.md` to know what counts as a contract violation, then writes findings to Chronicle as architectural memory entries that the next T1 session will surface as spec change proposals. Does not patch code — produces structured diagnoses, not patches.
---

# GS Monitor Production (T3)

## Overview

Production exceptions are specification gaps. The system fired a 429 the spec didn't say to handle, the latency p99 exceeded the SLO the contract claimed, the auth flow hit an edge case the use cases didn't enumerate. Each one is a finding: the spec was wrong, the spec was incomplete, or the world changed. The T3 monitor skill catches them while course-correction is still cheap.

The architectural decision: **T3 does not write to a separate ticket system.** It writes to the same Chronicle memory layer the AI reads at the start of every T1 development session. The signal lives in the same address space as the spec, so the next dev session inherits it automatically.

(Operational artifact note: the CLI command is `forgecraft check_t4` and the Chronicle tag is `t4-signal` — both retain the legacy "t4" prefix from the prior numbering. The conceptual tier is T3 Production; the tags will be renamed in a coordinated code-change pass.)

## When to Use

- The user mentions a production exception, incident, alert, or anomaly
- A monitoring dashboard / log aggregator surfaces a class of error the AI should triage
- Latency p95 / p99 exceeds the SLO the NFR contract claimed
- A class of exception that wasn't in the use-case enumeration starts firing
- The user says "production is acting weird", "p99 went up", "we're getting 5xx", "users are complaining about X"

**When NOT to use:**

- Local-dev exceptions — those are T1 debugging
- Staging exceptions — those should have been caught by `gs-verify-deploy` and routed to T1
- One-off support tickets that aren't reproducible — escalate to human triage first
- Capacity / cost incidents — that's infrastructure, not a spec drift signal

## The Process

### Phase 1 — Verify the monitoring contract exists

`docs/specs/monitoring-spec.md` is the production contract. It enumerates:

- Exception classes that signal specification drift (vs. expected operational errors)
- Alert thresholds with exact numeric criteria (not "high latency" — `p99 > 800ms for 5 min`)
- SLO definitions in PromQL or equivalent query language
- Correlation ID schema (how to trace a request across services)
- PII redaction policy (what NEVER appears in logs)
- Mapping from each exception class to the spec property it violates

If `monitoring-spec.md` doesn't exist, run `forgecraft setup_monitoring` first. The MCP tool generates it from the NFR section of `docs/specs/spec.md`. Without it, the diagnostic agent has nothing to evaluate against — it produces noise, not signal.

### Phase 2 — Invoke the diagnostic agent

If forgecraft-eye is deployed alongside the production system (Lambda / cloud function), the signals already flow to Chronicle. Surface them via `forgecraft check_t4` (legacy name; queries Chronicle for `t4-signal` entries on the current project).

If forgecraft-eye is **not** deployed, the manual path is:

1. Pull the relevant log window (Splunk / CloudWatch / Datadog)
2. Filter to exception classes named in `monitoring-spec.md`
3. For each, evaluate against the spec: is this a known failure mode? An undocumented edge case? A spec invariant violation?
4. Write the diagnosis to Chronicle: `mcp__chronicle__chronicle action=remember memory_type=architectural tags=[t4-signal, <project-name>] confirmed=true content="<structured diagnosis>"`

### Phase 3 — Surface to the user as spec-change candidates

Each signal becomes a proposal: "Exception class `PaymentRetryExhausted` is firing on 0.3% of payments. The use-case postcondition says 'failed payments enter retry queue with exponential backoff' (NFR-14). The exception indicates the retry queue does not handle HTTP 429 from the upstream gateway. **Proposed spec update**: add a rate-limit branch to the payment retry use case."

Do not patch the code. The architectural decision is the user's: confirm spec change, then route to `gs-remediate` to implement.

### Phase 4 — Close the signal

When the user confirms the spec change and the corresponding `gs-remediate` cycle ships, mark the Chronicle entry as `resolved: true`. This is the closing of the T3 → T1 loop. The next dev session won't see the same signal twice.

## Pure-GS Variant (No PragmaWorks / forgecraft-eye)

The manual discipline:

1. Maintain `docs/specs/monitoring-spec.md` by hand (one-line entries: exception class → spec violation → severity)
2. After each incident, the on-call writes one architectural ADR entry: what happened, what spec was wrong, what changed in the spec, what changed in the code
3. The ADR is the cross-session signal. The next session reads it. No tool required, just discipline.

This is what the skill enforces — the discipline above the tooling. The tooling makes it survive operational pressure.

## Tier Context

T3 (Production) verification half. T3's authoring half is the deployment of the monitoring infrastructure itself (forgecraft-eye + monitoring-spec.md generation). This skill is the read/diagnose side.

## Hook Integration

In a forgecraft-governed repo, this skill is triggered by:
- A `.claude/hooks/session-start.sh` that runs `forgecraft check_t4` and surfaces pending `t4-signal` entries to the AI before the user types anything
- An external alert hook (PagerDuty webhook, Slack incident channel) that fires the skill with the alert context as input
