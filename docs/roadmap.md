# Harmovela Protocol Roadmap

> The protocol's formal working name is **Harmovela Protocol**. The current 0.1 draft remains the compatibility baseline while public identity and technical identifiers transition through versioned releases. Legacy technical identifiers such as `schemas/aep-envelope.schema.json` and `AEP-C3` stay valid until that migration completes.

## Direction Of Travel

Harmovela's value grows through a **capability maturity stack**. Each layer depends on the one below and only becomes meaningful once the lower layer is stable. Events are the substrate; coordination is the current frontier; adaptation is the horizon.

| Layer | Question it answers | Autonomy | Status | Detail |
| --- | --- | --- | --- | --- |
| **Event** | What happened? — typed, correlatable communication substrate | L0 | Delivered / stable | [event-layer.md](roadmap/event-layer.md) |
| **Coordination** | Who does what, on what shared truth? — delegation, ownership, state agreement | L1–L2 | Active, semantics tightening | [coordination-layer.md](roadmap/coordination-layer.md) |
| **Adaptation** | How does the system observe, adjust, and evolve? — feedback, production-autonomy boundaries | L3 (in scope); L4/AGI (non-goals) | Future | [adaptation-layer.md](roadmap/adaptation-layer.md) |

**Where we are now:** the Event layer is complete and stable. Active work is tightening the Coordination layer so multiple agents can be delegated to and reconcile shared state interoperably. The Adaptation layer — feedback, then governed production autonomy — is the next horizon.

## Autonomy Ladder

Harmovela is a coordination protocol, not an intelligence model. Version milestones commit only to the coordination semantics required at each level, never to the intelligence of the implementing agent.

| Level | Definition | Status | Layer |
| --- | --- | --- | --- |
| L0 | Event-aware agent | Supported | Event |
| L1 | Bounded autonomous task agent | Supported, but relies on implementer policy | Coordination |
| L2 | Multi-agent collaboration and delegation | Partially supported; semantics need tightening | Coordination |
| L3 | Production autonomy with audit, budget, and authorization boundaries | Not yet achieved | Adaptation |
| L4 | Open-ended long-term autonomy | Not to be promised by 1.0 | Adaptation (non-goal) |
| AGI | General intelligence capability | Not a protocol version target | Out of scope |

**L3 is the 1.0 ceiling.** L4 and AGI are stated only to bound the promise, never scheduled.

## Release Path

The 0.1 → 1.0 milestones are the delivery timeline. Each release is labeled by the layer it advances and the autonomy level it targets.

| Release | Advances | Target level | Goal |
| --- | --- | --- | --- |
| **0.1 Transition** | Event | L0–L1 (documented) | Establish the Harmovela identity and document the L1 policy surface without changing wire behavior. |
| **0.2 Core Stabilization** | Coordination | L1 (frozen) | Freeze the L0–L1 coordination core: envelope, session, subscription, task lifecycle, errors, correlation, version negotiation, declared delivery semantics. |
| **0.3 Optional Profiles** | Coordination | L2 (tightened) | Tighten delegation/handoff/escalation/cancellation into a conformance-tested profile; separate durable delivery and security into adoptable profiles. |
| **0.4 Beta** | Coordination | L2 (interoperable) | Prove L2 multi-agent coordination across two independent implementations with a public conformance matrix. |
| **0.5 Adaptation Preview** | Adaptation | L3 (specified and testable) | Define feedback/outcome correlation and protocol-level budget, audit, and authorization semantics; publish the L3 profile and cross-language conformance fixtures. |
| **0.9 Release Candidate** | Adaptation | L3 (validated) | Validate the complete 0.5 L3 semantics without feature expansion through reproducible RC fixtures and compatibility matrix, governance/security/registry processes, and an external L3 autonomy pilot. |
| **1.0** | Adaptation | L3 (stable) | Publish stable L3 coordination semantics with a documented boundary declaring L4 and AGI as non-goals. |

Layer documents provide release-specific entry and exit gates.

## Immediate Next Step

The current frontier is the **[Coordination layer](roadmap/coordination-layer.md)**. Concretely, the next actionable work is:

1. Finish the **0.1 Transition** identity migration in the [Event layer](roadmap/event-layer.md) so Harmovela naming is consistent and legacy identifiers have a compatibility policy.
2. Document the **L1 bounded-autonomy policy surface** (budget, timeout, allowed actions, termination) so bounded autonomy is a contract, not an assumption.
3. Begin **tightening delegation semantics** (single-owner transfer, deterministic cancellation propagation, escalation contract) with positive and negative conformance fixtures — the core of the 0.2–0.3 releases.

## Layer Documents

Layer documents classify historical work by the capability it enables, not the chronological phase that originally delivered it.

- [Event layer](roadmap/event-layer.md) — foundation; absorbs completed Phases 0–8; stable (L0).
- [Coordination layer](roadmap/coordination-layer.md) — active work; delegation and shared-truth semantics; releases 0.2–0.4 (L1–L2).
- [Adaptation layer](roadmap/adaptation-layer.md) — future; feedback and governed production autonomy; releases 0.5–1.0 (L3), with L4/AGI as non-goals.

## Design Record

The rationale for this layered structure is recorded in [docs/design/2026-07-12-layered-roadmap-design.md](design/2026-07-12-layered-roadmap-design.md).
