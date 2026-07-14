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

No Coordination dimension may be extracted from a legacy implementation until the Event/Governance contract foundation passes its shared fixtures and the compatibility matrix has an approved decision for every touched public surface.

## Work Items

### 1. Document the L1 policy surface

Bounded autonomy is only real if the boundary is specified. At L1, a budget is an advisory, implementer-supplied declaration (for example cost, time, or action count). It may bound one runtime's behavior, but Harmovela does not yet define portable enforcement, authority, violation events, or conformance for it. Those become L3 Adaptation-layer requirements. Document timeout policy, allowed actions, and termination conditions so an L1 agent is bounded by contract, not by hope. Ships as documentation and negotiated capabilities, not new wire behavior.

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
| **0.3 Optional Profiles** | Define `harmovela.coordination.v1` as the canonical L2 profile for Task, State, and Delegation semantics, including delegation, handoff, escalation, and cancellation propagation; add missing authorization and tenant-isolation fixtures. `harmovela.runtime-semantics.v1` retains belief, freshness, interruption, compensation, and provenance. Delivery and security profile definitions already exist and are not rescheduled here. | L2 (tightened) |
| **0.4 Beta** | Prove `harmovela.coordination.v1` across at least two independent implementations running the standard stdio or WebSocket session topology, with a public conformance matrix and three documented integration scenarios. | L2 (interoperable) |

## Release Gates

### 0.2 Core Stabilization

Entry criteria:
- A public Harmovela identity and compatibility policy for legacy technical identifiers.

Exit criteria:
- Frozen L0-L1 core: envelope, session, subscription, task lifecycle, errors, correlation, version negotiation, and declared delivery semantics.
- Shared positive and negative lifecycle fixtures cover acceptance, progress, blocked work, terminal outcomes, cancellation, and invalid transitions.
- Conformance levels, manifest expectations, and the default runner target are internally consistent.
- The L1 advisory policy surface is documented and capability-negotiable.

### 0.3 Optional Profiles

Entry criteria:
- 0.2 core compatibility policy and lifecycle fixtures are published.

Exit criteria:
- The canonical `harmovela.coordination.v1` L2 profile defines Task, State, and Delegation scope, identifier, dependencies, capability negotiation, versioning, and conformance fixtures.
- `harmovela.runtime-semantics.v1` retains belief, freshness, interruption, compensation, and provenance semantics.
- Delegation, ownership transfer, handoff, escalation, and cancellation propagation have positive and negative fixtures.
- Implementations can declare and filter conformance by profile.
- Security-profile fixtures cover authorization and tenant-isolation behavior already defined by the security profile; audit remains implementation-specific until L3 policy/audit work.

### 0.4 Beta

Entry criteria:
- 0.3 profile declarations and fixtures are complete.
- The frozen core has a published compatibility policy.

Exit criteria:
- A named `harmovela.coordination.v1` manifest/profile declaration is published.
- At least two independently maintained implementations run the same declared, named, versioned standard topology (`stdio` or `WebSocket`) at the L2 coordination profile.
- The async task orchestration, shared state/context invalidation, and delegated task handoff scenarios each pass their declared fixture assertions.
- A public conformance matrix records implementation version, profile, topology identifier and version, and versioned scenario and fixture identifiers and results.
- Zero open core or L2 conformance issues are classified blocker or critical.
- A community governance proposal is published.

Once coordination is interoperable and stable, effort moves up to the [Adaptation layer](adaptation-layer.md).
