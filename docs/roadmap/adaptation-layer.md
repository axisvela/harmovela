# Adaptation Layer — Future Horizon

> Part of the [Harmovela roadmap](../roadmap.md). This layer answers **"How does the system observe outcomes, adjust, and evolve?"** — the semantics that sit above [Coordination](coordination-layer.md) once multiple agents can reliably work together.

**Autonomy mapping:** L3 (production autonomy with audit, budget, and authorization boundaries) is in scope for 1.0. L4 (open-ended long-term autonomy) and AGI (general intelligence) are explicit non-goals.

**Status:** Delivered - 0.5 Adaptation Preview.

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
- The L3 adaptation profile depends on `harmovela.security.v1`, which continues to own base HARMOVELA-C0/C1 identity, authorization, audit, and tenant-isolation behavior; L3 defines only adaptation-operation extensions.
- Adaptation-operation extensions define authority and audit linkage for feedback/outcome, budget establishment, change, enforcement, and violation, and authorization checks for those operations.
- An L3 adaptation profile defines identifier, dependencies, capability negotiation, versioning, and conformance requirements.
- Shared positive and negative L3 fixtures cover outcome correlation; authorized and unauthorized feedback/outcome and budget establishment, change, enforcement, and violation operations; limit approach and exceedance; and adaptation-operation audit linkage.

## Release Mapping

| Release | Focus | Target level |
| --- | --- | --- |
| **0.5 Adaptation Preview** | Specify and implement feedback/outcome correlation; security-profile-dependent adaptation-operation authority, audit linkage, and authorization checks; L3 adaptation-profile declaration; and cross-language conformance fixtures. | L3 (specified and testable) |
| **0.9 Release Candidate** | Validate the complete 0.5 L3 semantics without feature expansion through reproducible RC fixtures and compatibility matrix, governance/security/registry processes, and an external L3 autonomy pilot. | L3 (validated) |
| **1.0** | Publish stable L3 coordination semantics with a documented boundary declaring L4 and AGI as non-goals. | L3 (stable) |

## Release Gates

### 0.5 Adaptation Preview

Entry criteria:
- The L2 coordination profile is interoperable at 0.4.

Exit criteria:
- Feedback/outcome and adaptation-operation specifications, an L3 profile declaration that depends on `harmovela.security.v1`, and shared fixtures are published; the existing Security Profile retains base HARMOVELA-C0/C1 identity, authorization, audit, and tenant-isolation behavior.
- Adaptation-operation semantics identify authority and audit linkage for feedback/outcome and budget establishment, change, enforcement, and violation; budget semantics identify the enforcement point and observable limit-approaching and limit-exceeded outcomes.
- Authorization checks cover feedback/outcome and budget establishment, change, enforcement, and violation operations.
- Every reference implementation passes the declared L3 fixtures.

### 0.9 Release Candidate

Entry criteria:
- 0.5 L3 specifications and fixtures are complete.
- No unresolved breaking core, L2, or L3 semantic changes remain.

Exit criteria:
- The compatibility matrix covers two implementations maintained in distinct public repositories by distinct maintainers, one declared versioned L3 profile, one named and versioned existing transport profile, one named and versioned topology identifier distinct from that transport profile, and an official versioned L3 fixture/scenario suite; each matrix row records both the transport profile and topology identifier with their versions.
- Required matrix cells are each implementation x the selected L3 profile x the selected topology identifier and version x every official fixture/scenario; every cell passes.
- A `release-blocker` is an open issue tagged by the designated release maintainer in the public tracker; zero `release-blocker` issues may remain.
- Public governance, release, security-response, and registry processes are published.
- An external L3 autonomy pilot has an operator who is not a maintainer of either participating implementation. Its published report identifies both implementation names and versions, the L3 profile and version, transport profile and version, topology identifier and version, and official fixture/scenario-suite version; it publishes per-fixture and per-scenario pass/fail results demonstrating the feedback/outcome, budget, audit, and authorization boundaries, all of which pass. A generic interoperability pilot does not satisfy this gate.
- No new protocol features are added during the RC period.

### 1.0

Release criteria:
- Stable feedback/outcome correlation and budget, audit, and authorization boundaries.
- Repeatable conformance results across independently maintained implementations.
- Documented governance, release, licensing, trademark, upgrade, and deprecation policies.
- A published boundary declaring L4 open-ended autonomy and AGI as explicit non-goals.
