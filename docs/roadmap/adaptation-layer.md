# Adaptation Layer — Future Horizon

> Part of the [Harmovela roadmap](../roadmap.md). This layer answers **"How does the system observe outcomes, adjust, and evolve?"** — the semantics that sit above [Coordination](coordination-layer.md) once multiple agents can reliably work together.

**Autonomy mapping:** L3 (production autonomy with audit, budget, and authorization boundaries) is in scope for 1.0. L4 (open-ended long-term autonomy) and AGI (general intelligence) are explicit non-goals.

**Status:** Future. Design direction only — no stable semantics are promised yet.

## Purpose

Once agents coordinate reliably, the next value comes from a system that watches the results of its own work and changes what it does. This layer has three ascending stages: **feedback** (observe outcomes), **adaptation** (adjust behavior within governed boundaries), and — bounded and mostly out of scope — **self-evolution** (change its own behavior over time).

Harmovela remains a coordination protocol, not an intelligence model. This layer standardizes the *coordination semantics* that make feedback and adaptation observable, auditable, and governable — never the intelligence of the implementing agent.

## Stage 1 — Feedback (observe outcomes)

Make the results of coordinated work first-class, correlatable events so the system can reason about its own performance:

- Outcome events tying a completed task back to its originating goal, delegation chain, and cost.
- Provenance that lets a consumer trace why a decision was made.
- Signals (success, failure, drift, staleness) that a controller can subscribe to and act on.

This builds directly on the existing provenance and freshness event families.

## Stage 2 — Production Autonomy Boundaries (L3)

Adaptation is only safe inside enforced boundaries. Before Harmovela can claim production autonomy, three boundaries must be protocol-level and conformance-tested:

- **Budget** — declared, enforced limits on cost, time, and action count, with events emitted when limits are approached or exceeded.
- **Audit** — a verifiable trail of who did what, on whose authority, across a delegation chain.
- **Authorization** — capability-scoped permissions that constrain every other dimension, checked at the protocol boundary rather than in application logic.

L3 is the ceiling for 1.0: a system that adapts within audited, budgeted, authorized boundaries.

## Stage 3 — Self-Evolution (bounded discussion only)

Open-ended, long-term autonomy where a system rewrites its own coordination behavior (**L4**) is stated here only to bound the promise. It is **not** scheduled and **not** part of the 1.0 commitment. If it is ever approached, it must be gated behind the L3 audit, budget, and authorization boundaries, never before them.

## Non-Goals

- **L4 — open-ended long-term autonomy.** Not promised by 1.0.
- **AGI — general intelligence capability.** Not a protocol version target. Harmovela does not define a general intelligence model or universal ontology.

These non-goals are load-bearing: they keep the 1.0 promise honest and prevent the protocol from claiming behavior it cannot guarantee.

## 0.5 Adaptation Preview Deliverables

- A feedback/outcome event specification that correlates each outcome to its task, goal, delegation chain, authority, and declared or consumed cost.
- Budget semantics defining the authority that establishes a budget, the enforcement point, and limit-approaching and limit-exceeded events.
- An L3 adaptation profile defining identifier, dependencies, capability negotiation, versioning, and conformance requirements.
- Shared positive and negative fixtures for outcome correlation, authorized and unauthorized budget changes, limit approach, limit exceedance, and audit linkage.

## Release Mapping

| Release | Focus | Target level |
| --- | --- | --- |
| **0.5 Adaptation Preview** | Specify and implement feedback/outcome correlation, budget authority/enforcement/violation semantics, L3 adaptation-profile declaration, and cross-language conformance fixtures. | L3 (specified and testable) |
| **0.9 Release Candidate** | Validate the complete 0.5 L3 semantics without feature expansion through RC fixtures, compatibility matrix, governance/security/registry processes, and at least one external autonomy pilot. | L3 (validated) |
| **1.0** | Publish stable L3 coordination semantics with a documented boundary declaring L4 and AGI as non-goals. | L3 (stable) |

## Release Gates

### 0.5 Adaptation Preview

Entry criteria:
- The L2 coordination profile is interoperable at 0.4.

Exit criteria:
- Feedback/outcome and budget specifications, L3 profile declaration, and shared fixtures are published.
- Budget semantics identify authority, enforcement point, and observable limit-approaching and limit-exceeded outcomes.
- Every reference implementation passes the declared L3 fixtures.

### 0.9 Release Candidate

Entry criteria:
- 0.5 L3 specifications and fixtures are complete.
- No unresolved breaking core, L2, or L3 semantic changes remain.

Exit criteria:
- Release-candidate fixtures and a public compatibility matrix pass across declared implementations.
- Public governance, release, security-response, and registry processes are published.
- At least one external deployment or interoperability pilot validates the L3 profile.
- No new protocol features are added during the RC period.

### 1.0

Release criteria:
- Stable feedback/outcome correlation and budget, audit, and authorization boundaries.
- Repeatable conformance results across independently maintained implementations.
- Documented governance, release, licensing, trademark, upgrade, and deprecation policies.
- A published boundary declaring L4 open-ended autonomy and AGI as explicit non-goals.
