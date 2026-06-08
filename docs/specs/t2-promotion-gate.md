# Tier 2 — Promotion Gate Policy

> The forcing function for the Harden stage. Declared at Mold (NFRs + policy
> live in the spec); its body is built at Harden (Hurl/Playwright/wiring to
> real endpoints, generatable only once the code exists).

## What the gate forces

Nothing promotes to the next environment (staging → prod) unless it demonstrates
**two of the seven properties at production fidelity**:

- **Executable** — the spec's use cases actually run end-to-end against the
  deployed artifact. The generative execution (the use-case walk driving the
  live app) is the proof: not "the tests pass" but "the system does the thing."
- **Verifiable** — every NFR threshold and every use-case postcondition is
  checked against the spec **by the harness**, not by a human.

`NFR battery + generative execution = Executable and Verifiable, demonstrated.`

## Enforcement

| Level | Mechanism | Effect |
|---|---|---|
| Behavioral | post-deploy hook auto-fires `gs-verify-deploy` | AI cannot silently skip verification |
| Hard gate | pipeline runs `gs-verify-deploy`; promotion gated on its exit code | nothing promotes without a green walk |

## Gate definition (forgecraft policy)

```yaml
# append to a project's forgecraft.yaml when it reaches T2
tier_2:
  promotion_gate:
    blocks_promotion: true
    enforced_by: gs-verify-deploy        # auto-fires on deploy-shaped context
    checks:
      - id: nfr_battery
        proves: verifiable
        source: docs/specs/spec.md#non-functional-requirements
        tools: [hurl, k6]                 # contract + SLO / load / latency
        fail: block
      - id: use_case_walk
        proves: [executable, verifiable]
        source: docs/specs/use-cases.md   # every UC-/F-NNN in scope
        skill: qa-walk                    # the multimodal verification loop
        evidence_layers:                  # gather, then check coherence
          state:    [sql, db-mcp]         # before / after / delta
          behavior: [playwright-mcp+vision] # UI · mobile-mcp · hurl (headless)
          business: [logs, traces]        # business layer got the right thing
          lineage:  [etl-trace, event-trace] # pipelines / async, when applicable
        coherence: required               # UI == logs == DB, else fail even if each passes
        fail: block
    on_fail:
      retry: false                        # never silently retry
      route_to: gs-remediate              # code fix → back through T1
      rollback: human
    on_pass:
      record: chronicle                   # tag: t2-passed
      promote: true
```

## The verification loop (what `use_case_walk` runs)

A use case is verified by triangulating evidence across every layer it touches
and checking the layers **cohere** — not by one tool. See
`skills/gs-verify-deploy/SKILL.md` § "The Verification Loop" for the full loop,
the evidence-layer → tool map, and the patterns (headless, mobile, simulation,
ETL, event-driven).

The principle: **pick the evidence layers the use case actually touches, drive
each with the right tool, verify they cohere.** Coherence across layers is what
separates real verification from test theater.

## Relationship to the other tiers

- **T1 gate** — `forgecraft.yaml` cascade (functional_spec, architecture,
  constitution, ADRs, behavioral_contracts) + commit-msg / pre-commit hooks + CI.
  Proves correctness in isolation.
- **T2 gate (this)** — proves Executable + Verifiable at production fidelity.
- **T3** — `gs-monitor-production` takes over once T2 passes.
