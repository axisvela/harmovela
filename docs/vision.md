# Harmovela Vision

## One-Line Vision

Harmovela provides the open coordination layer for autonomous systems to sense, decide, act, recover, and evolve together.

## Problem

Modern autonomous systems face coordination challenges that go far beyond synchronous tool calls. Agents, tools, memory systems, and runtimes must coordinate across multiple interdependent dimensions, and the absence of a shared protocol forces each system to invent its own patterns.

### Beyond events and async

Event streams and asynchronous communication are necessary but insufficient. Autonomous systems also need standard primitives for:

- **State management**: agents must know what is true now, when state becomes stale, and when it changes — without every consumer polling or guessing.
- **Delegation**: work must flow across entities through assignment, acceptance, handoff, escalation, and cancellation — not ad-hoc message passing with no lifecycle guarantees.
- **Recovery**: when components fail, restart, or lose connection, the system must recover through idempotency, replay, checkpoints, and compensation — not custom retry logic in every integration.
- **Governance**: coordination spans trust boundaries — identity, authorization, audit, tenant isolation — requiring verifiable protocol-level boundaries, not application-level conventions.

Without a unified coordination protocol, each dimension is reinvented per-vendor, per-runtime, and per-integration. Polling loops, custom webhooks, tool-specific callbacks, ad-hoc message queues, and prompt-level conventions proliferate. These approaches do not compose across agent runtimes, tools, memory systems, and deployment environments.

## Vision

Harmovela integrates seven interdependent coordination dimensions into one open protocol:

| Dimension | What Harmovela defines |
|---|---|
| Event | What happened — publish, subscribe, correlate, replay, acknowledge. |
| Task | What is executing — lifecycle from submitted through completed, failed, or cancelled. |
| State | What is true now — versioned state, freshness windows, invalidation, change propagation. |
| Context / Memory | What informs decisions — updates, invalidation, provenance, retrieval readiness. |
| Delegation | Who does what — assignment, acceptance, handoff, escalation, cancellation propagation. |
| Recovery | What to do when things break — idempotency, replay, checkpoints, interruption, compensation. |
| Governance | Who can do what — identity, authorization, audit, tenant isolation, policy integration. |

These dimensions are not isolated features. Task lifecycle produces events. Delegation chains produce recovery obligations. State changes trigger context invalidation. Governance constrains every other dimension. The protocol treats them as a unified whole, not a bag of features.

Three interwoven qualities emerge from this unification:

- **Connection & Collaboration**: network effects across autonomous entities, collective intelligence that grows with participants, alignment across agents, tools, and runtimes.
- **Dynamic & Evolution**: continuous adaptation to changing environments, emergence of coordinated behavior, flow of context and state over time.
- **Order & Governance**: trust through verifiable boundaries, balance between autonomy and constraint, resilient coordination under uncertainty.

## Core Use Cases

### Event Streams

Agents need to receive events from tools, environments, memory systems, orchestrators, and other agents.

Examples:

- A memory system emits `memory.fact.invalidated`.
- A browser observer emits `environment.page.changed`.
- A robotics sensor emits `environment.object.detected`.
- A workflow engine emits `task.blocked`.

Harmovela provides publish, subscribe, correlate, replay, and acknowledge semantics so events are first-class protocol objects, not ad-hoc JSON messages.

### Task Lifecycle

Some tool calls are too slow or open-ended for synchronous RPC. Harmovela represents these as tasks with a full lifecycle: submitted, accepted, executing, progressing, completed, failed, cancelled, and timed-out. Every transition is an event that consumers can subscribe to.

### State And Context

Agents need to react when what they know becomes stale. Harmovela defines versioned state updates, freshness windows, invalidation, and change propagation so consumers receive structured notifications rather than polling.

### Delegation And Recovery

Agents need to share work across entities. Harmovela defines assignment, acceptance, handoff, escalation, and cancellation propagation as protocol-level primitives. When components fail, the protocol specifies recovery through idempotency, replay, checkpoints, and compensation — not custom retry logic.

### Governance

Autonomous coordination requires verifiable boundaries. Harmovela provides identity, authorization, audit, and tenant isolation at the protocol level so trust boundaries are explicit and machine-verifiable — not application-level conventions.

## Goals

- Define a unified protocol-level coordination model integrating event, task, state, context/memory, delegation, recovery, and governance dimensions.
- Provide standard event types for task lifecycle, tool feedback, context changes, memory updates, agent messages, and delegation flows.
- Enable connection and collaboration through publish/subscribe, delegation, and shared context — growing network effects across autonomous entities.
- Support dynamic adaptation through versioned state, freshness windows, invalidation, and change propagation.
- Provide order and governance through identity, authorization, audit, tenant isolation, and policy integration.
- Support local and distributed runtimes across multiple transports.
- Preserve causality and correlation across conversations, tasks, tool calls, and events.
- Enable replay and recovery after disconnection.
- Keep the core small enough for easy implementation while remaining extensible for domain-specific needs.

## Non-Goals

- Harmovela is not a replacement for MCP.
- Harmovela is not a new LLM inference API.
- Harmovela is not a general database API.
- Harmovela is not a mandatory message broker implementation.
- Harmovela does not define every domain-specific event schema.
- Harmovela does not define a general intelligence model or universal ontology.

## Design Principles

- **Connection before control**: coordinate across boundaries before constraining behavior — openness enables network effects.
- **Protocol before platform**: define interoperable messages before choosing infrastructure.
- **MCP-compatible, not MCP-dependent**: integrate with MCP while remaining useful outside MCP.
- **Event-first**: asynchronous communication should not be modeled as fake synchronous calls.
- **Adaptation is explicit**: state freshness, invalidation, and change propagation must be declared, not inferred.
- **Trust boundaries are protocol boundaries**: identity, authorization, and audit must be embedded in the protocol, not deferred to application logic.
- **Durability optional, semantics explicit**: transports may be ephemeral or durable, but delivery guarantees must be declared.
- **Causality matters**: every event should be traceable to a task, conversation, or triggering event when available.
- **Human-readable, machine-validatable**: JSON should be easy to inspect and schema-check.
- **Small core, extensible domains**: standardize the envelope and lifecycle events; allow domain-specific payloads.
