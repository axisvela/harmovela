# Coordination Layer — Active Frontier

> Part of the [Harmovela roadmap](../roadmap.md). This layer answers **"Who does what, on what shared truth?"** — the semantics that let multiple autonomous entities work together on top of the [Event layer](event-layer.md).

**Autonomy mapping:** L1 (bounded autonomous task agent) → L2 (multi-agent collaboration and delegation).

**Status:** Active. The primitives exist; the semantics need tightening before they are safely interoperable across independent implementations.

## Purpose

Events tell each participant what happened. Coordination tells participants how to act together: who owns a task, how work is handed off, how conflicting state is reconciled, and how cancellation propagates through a chain of delegations. This is the current frontier of the protocol — the layer where Harmovela becomes more than a message bus.

## Why This Is The Current Gap

The autonomy ladder places two levels in this layer:

- **L1 — bounded autonomous task agent.** Supported today, but correct behavior still relies on implementer-supplied policy. Harmovela carries the task lifecycle; it does not yet document the policy surface an implementer must provide to keep a task bounded.
- **L2 — multi-agent collaboration and delegation.** Only partially supported. Delegation, handoff, escalation, and cancellation-propagation events exist, but their semantics are loose enough that two independent implementations could interpret them differently.

Closing this gap is the central goal of the 0.2–0.4 releases.

## Work Items

### 1. Document the L1 policy surface

Bounded autonomy is only real if the boundary is specified. Document what an implementer must supply — budget limits, timeout policy, allowed actions, termination conditions — so an L1 agent is bounded by contract, not by hope. Ships as documentation and negotiated capabilities, not new wire behavior.

### 2. Tighten delegation semantics

Make assignment, acceptance, handoff, escalation, and cancellation propagation unambiguous:

- Exactly one owner at a time; ownership transfer is an observable, ordered event.
- Cancellation of a parent task deterministically propagates to delegated children.
- Escalation has a defined target-selection and acknowledgement contract.
- Rejected or timed-out handoffs have defined fallback behavior.

Each rule gets positive and negative conformance fixtures.

### 3. Strengthen shared-truth (state) agreement

Coordination requires agreement on current truth. Tighten versioned state updates, freshness windows, invalidation, and change propagation so consumers converge on the same view without polling, and so stale-state conflicts have defined resolution.

### 4. Package coordination as an adoptable profile

Separate the stable core from independently adoptable coordination capabilities. The delegation profile must define its identifier, dependencies, capability negotiation, versioning, and conformance fixtures, so implementations can declare L2 support explicitly.

## Release Mapping

| Release | Focus | Target level |
| --- | --- | --- |
| **0.2 Core Stabilization** | Freeze the L0–L1 core: envelope, session, subscription, task lifecycle, errors, correlation, version negotiation, declared delivery semantics. Document the L1 policy surface. | L1 (frozen) |
| **0.3 Optional Profiles** | Tighten delegation/handoff/escalation/cancellation into a conformance-tested profile; separate durable delivery and security into adoptable profiles. | L2 (tightened) |
| **0.4 Beta** | Prove L2 multi-agent coordination across at least two independent implementations with a public conformance matrix and three documented integration scenarios. | L2 (interoperable) |

## Exit Criteria

- L1 bounded-autonomy policy surface is documented and capability-negotiable.
- Delegation, handoff, escalation, and cancellation-propagation semantics are unambiguous and conformance-tested.
- At least two independently maintained implementations interoperate at L2 with no unremediated core regressions.
- A community governance proposal is published.

Once coordination is interoperable and stable, effort moves up to the [Adaptation layer](adaptation-layer.md).
