# Harmovela Protocol Roadmap

> The protocol's formal working name is **Harmovela Protocol**. The current 0.1 draft remains the compatibility baseline while public identity and technical identifiers transition through versioned releases. Legacy technical identifiers such as `schemas/aep-envelope.schema.json` and `AEP-C3` stay valid until that migration completes.

## Direction Of Travel

Harmovela's value grows through a **capability maturity stack**. Each layer depends on the one below and only becomes meaningful once the lower layer is stable. Events are the substrate; coordination is the current frontier; adaptation is the horizon.

| Layer | Question it answers | Autonomy | Status | Detail |
| --- | --- | --- | --- | --- |
| **Event** | What happened? — typed, correlatable communication substrate | L0 | Delivered / stable | [event-layer.md](roadmap/event-layer.md) |
| **Coordination** | Who does what, on what shared truth? — delegation, ownership, state agreement | L1–L2 | Active, semantics tightening | [coordination-layer.md](roadmap/coordination-layer.md) |
| **Adaptation** | How does the system observe, adjust, and evolve? — feedback, production-autonomy boundaries | L3 (in scope); L4/AGI (non-goals) | Delivered (1.0) | [adaptation-layer.md](roadmap/adaptation-layer.md) |

**Where we are now:** the Event layer is complete and stable (0.1 delivered). The Coordination layer is delivered and interoperable (0.2–0.4 delivered). The Adaptation layer feedback/outcome and L3 autonomy boundaries are specified and conformance-tested (0.5 delivered). Protocol 1.0 was declared released as a wire-compatible declaration (envelope `spec_version` remains `0.2`); the external-evidence gates deferred from the 0.9 RC were carried forward to 1.1 by explicit compatibility decision. The immediate next step is closing the 1.1 external-evidence gates.

## Autonomy Ladder

Harmovela is a coordination protocol, not an intelligence model. Version milestones commit only to the coordination semantics required at each level, never to the intelligence of the implementing agent.

| Level | Definition | Status | Layer |
| --- | --- | --- | --- |
| L0 | Event-aware agent | Supported | Event |
| L1 | Bounded autonomous task agent | Supported, but relies on implementer policy | Coordination |
| L2 | Multi-agent collaboration and delegation | Partially supported; semantics need tightening | Coordination |
| L3 | Production autonomy with audit, budget, and authorization boundaries | Achieved at Protocol 1.0; external validation in 1.1 | Adaptation |
| L4 | Open-ended long-term autonomy | Not to be promised by 1.0 | Adaptation (non-goal) |
| AGI | General intelligence capability | Not a protocol version target | Out of scope |

**L3 is the 1.0 ceiling.** L4 and AGI are stated only to bound the promise, never scheduled.

## Release Path

The 0.1 → 1.0 milestones are the delivery timeline. Each release is labeled by the layer it advances and the autonomy level it targets.

| Release | Advances | Target level | Goal | Delivered |
| --- | --- | --- | --- | --- |
| **0.1 Transition** | Event | L0–L1 (documented) | Establish the Harmovela identity and document the L1 policy surface without changing wire behavior. | :white_check_mark: |
| **0.2 Core Stabilization** | Coordination | L1 (frozen) | Freeze the L0–L1 coordination core: envelope, session, subscription, task lifecycle, errors, correlation, version negotiation, declared delivery semantics. | :white_check_mark: |
| **0.3 Optional Profiles** | Coordination | L2 (tightened) | Tighten delegation/handoff/escalation/cancellation into a conformance-tested profile; separate durable delivery and security into adoptable profiles. | :white_check_mark: |
| **0.4 Beta** | Coordination | L2 (interoperable) | Prove L2 multi-agent coordination across two independent implementations with a public conformance matrix. | :white_check_mark: |
| **0.5 Adaptation Preview** | Adaptation | L3 (specified and testable) | Define feedback/outcome correlation and protocol-level budget, audit, and authorization semantics; publish the L3 profile and cross-language conformance fixtures. | :white_check_mark: |
| **0.9 Release Candidate** | Adaptation | L3 (validated) | Superseded by 1.0. In-repository validation completed; external-evidence gates deferred to 1.1 by explicit compatibility decision. See [release notes](release/release-notes-v1.0.0.md). | |
| **1.0** | Adaptation | L3 (stable) | Delivered. Published stable L3 coordination semantics with a documented boundary declaring L4 and AGI as non-goals; released as a wire-compatible declaration. | :white_check_mark: |
| **1.1** | Adaptation | L3 (validated, external evidence) | Planned. Close the external-evidence gates deferred from 0.9: two independently maintained implementations, external L3 autonomy pilot, and zero `release-blocker` issues. | |

Layer documents provide release-specific entry and exit gates.

> **Git tag axis note:** the `v0.6.0` git tag is an **implementation/milestone** tag (protocol boundary documentation and Go harness coordination fix), not a Protocol release. It does not advance the Protocol version and does not occupy a row in the release path above. Implementation tags must not be read as Protocol releases; see [RELEASES.md](../RELEASES.md). The `v1.0.0` git tag **is** a Protocol release declaration.

## Immediate Next Step

With 0.1 through 0.5 delivered and Protocol 1.0 declared released, the immediate next-step priorities are:

1. **1.1 external-evidence gates** — close the gates deferred from the 0.9 RC by explicit compatibility decision: two independently maintained implementations, an external L3 autonomy pilot, and zero `release-blocker` issues. See [RELEASES.md](../RELEASES.md).
2. **1.1 release preparation** — publish the completed independent-implementation and external-pilot evidence per the [1.1 release criteria](../RELEASES.md).

## Layer Documents

Layer documents classify historical work by the capability it enables, not the chronological phase that originally delivered it.

- [Event layer](roadmap/event-layer.md) — foundation; absorbs completed Phases 0–8; stable (L0).
- [Coordination layer](roadmap/coordination-layer.md) — active work; delegation and shared-truth semantics; releases 0.2–0.4 (L1–L2).
- [Adaptation layer](roadmap/adaptation-layer.md) — delivered; feedback and governed production autonomy; releases 0.5–1.1 (L3), with L4/AGI as non-goals.

## Design Record

The rationale for this layered structure is recorded in [design/design/2026-07-12-layered-roadmap-design.md](design/2026-07-12-layered-roadmap-design.md).
