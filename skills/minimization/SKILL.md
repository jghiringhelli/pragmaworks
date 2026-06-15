---
name: minimization
description: Apply before and while generating code, to avoid over-engineering. Enforces a descending decision hierarchy — does it need to exist, stdlib, platform feature, installed dependency, one line, then the minimal implementation — so the assistant writes the least code that satisfies the spec. The GS-internal, HOW-layer adaptation of the "lazy senior developer" discipline; concretizes the Bounded property and the minimal-sufficient principle. Do NOT use it to trim security, data-loss handling, auth, or accessibility — those are never on the chopping block.
---

# Minimization (the least code that satisfies the spec)

> "The best code is the code you never wrote." This is the **HOW-layer** companion to GS: the
> specification (WHAT layer) governs *what must be derivable*; this skill governs *how little to write*
> while deriving it. The spec still rules — this never overrides an acceptance criterion.

## The decision hierarchy (descending cost — stop at the first that applies)
Before writing any custom code, walk down this ladder and stop at the first rung that works:

1. **Does this need to exist?** → If not, don't write it (YAGNI). The cheapest code is none.
2. **Standard library does it?** → Use the stdlib.
3. **Native platform/framework feature?** → Use it.
4. **An already-installed dependency does it?** → Use it (do not add a new dependency for a one-off).
5. **Is it one line?** → One line.
6. **Only then:** the minimal implementation that satisfies the spec — nothing speculative, no
   abstraction without a second caller, no configuration nobody asked for.

## Guardrail — lazy, not negligent (the Defended floor)
Minimization applies to *bespoke complexity*, never to safety. **Never trim:** trust-boundary/input
validation, data-loss handling, authn/authz, error handling on the failure path, accessibility. These
are required by the spec's NFRs and the *Defended* property — they are not "extra code."

## Why this is GS, not just a style preference
- **Bounded:** less bespoke code = smaller surface for a stateless reader to derive and verify.
- **Minimal-sufficient harness:** the same rule applies to the harness itself — do not over-harness
  (excess hooks/docs/abstraction re-create context degradation).
- **Spec-first:** if a rung conflicts with an acceptance criterion, the criterion wins. Minimization
  reduces *how* you satisfy the spec, never *whether* you satisfy it.

## How to apply
- At plan time: prefer the rung that removes work over the one that adds it.
- At review time: for any new abstraction/dependency/config, ask "which rung justified this?" If none,
  remove it.
- If you take a deliberate shortcut, mark it inline (e.g. a `TODO(min):` / shortcut comment naming the
  upgrade path) so deferred minimization debt is visible, not silent.

*Independent evidence this works: the `ponytail` ruleset reports ~80–94% less code at comparable
correctness across model tiers (see Compendium §5). This skill is the GS-native form of that discipline,
bounded by the spec.*
