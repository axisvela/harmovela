# Event Layer — Foundation

> Part of the [Harmovela roadmap](../roadmap.md). This layer answers **"What happened?"** — the typed, correlatable communication substrate that everything else builds on.

**Autonomy mapping:** L0 (event-aware agent).

**Status:** Delivered and stable. This is the frozen baseline of the protocol. 0.1 Transition completed: the public Harmovela identity is established, all wire identity decisions are resolved, the `aep` namespace has been removed from protocol surfaces, and legacy technical identifiers carry an explicit versioned compatibility policy.

## Purpose

The Event layer is the communication substrate. It defines how autonomous entities publish, subscribe to, correlate, replay, and acknowledge typed events. Nothing above this layer is meaningful until it is stable: coordination and adaptation both assume a reliable event substrate.

## What The Layer Provides

- A common event envelope with stable identity, source, target, causality, correlation, and timestamp fields.
- Session initialization and capability negotiation.
- Subscription by topic, type pattern, source, target, conversation, task, or domain.
- Task lifecycle as an event stream (submitted through completed, failed, cancelled, timed-out).
- Multiple transport bindings with declared delivery semantics.
- Durable delivery, replay cursors, acknowledgement, retry, and dead-letter primitives.
- Cross-language conformance with shared fixtures.

## Delivered Work (Phases 0–8)

The Event layer is the accumulated result of the project's first eight delivery phases. All are complete.

| Phase | Contribution to the Event layer |
| --- | --- |
| 0. Vision and design | Vision, architecture, protocol-design draft, MCP relationship, terminology |
| 1. Core specification draft | Envelope schema (`schemas/aep-envelope.schema.json`), event-type registry, session, subscription, task lifecycle, error model, versioning, shared fixtures |
| 2. Transport bindings | stdio, WebSocket, HTTP SSE, gRPC streaming, plus NATS, Kafka, and Redis Streams |
| 3. Reference implementation | Reference servers/clients, JSON Schema validation, local router, cross-language conformance |
| 4. MCP bridge | MCP tool-call to task bridge, task-completion events from MCP tools, interop examples |
| 5. Reliability and production semantics | Replay cursors, acknowledgement protocol, dead-letter events, and retry policy |
| 6. Ecosystem and conformance | Public spec site, compatibility test suite, conformance levels, contribution guide, and code of conduct |
| 7. Event-family conformance | Differentiation document, six new event families, and cross-language fixtures |
| 8. Delivery end-to-end conformance | `HARMOVELA-C3` level with `delivery_e2e`, full DeliveryTracker traces in all four languages, payload schema validation |

Identity, authorization, audit, tenant isolation, and registry governance are cross-cutting governance foundations. Delegation and runtime semantics are recorded in the Coordination layer because they establish multi-agent behavior above the event substrate.

## Current State

The protocol covers 17 specifications, 4 conformance levels (C0–C3), 7 cross-language fixtures, 4 transport bindings, ~370 tests across four languages, and a published spec site at https://axisrobo.github.io/harmovela/. The default conformance target is `HARMOVELA-C3`. DeliveryTracker integration is available in every language. A networked PostgreSQL delivery-store backend ships in all four languages alongside the in-memory and SQLite backends.

## Remaining Foundation Work

The Event layer is functionally complete. Identity migration is delivered as the 0.1 Transition — all work items below are complete:

- **Harmovela** established as the public protocol identity in all documentation. ✓
- Legacy technical identifiers (schema URIs, wire version fields, package names, `AEP-C*` levels) carry an explicit compatibility policy. ✓
- The migration sequence for protocol identity, schema identifiers, package names, and repository paths is documented — wire behavior and delivery guarantees remain unchanged. ✓
- The `aep` namespace has been removed from all protocol surfaces; dimension modules are no longer under a legacy `aep` namespace. ✓

No remaining Event-layer work is scheduled.

## Exit Criteria — All Met

- Public documentation consistently identifies Harmovela as the protocol. ✓
- Legacy technical identifiers have an explicit, versioned compatibility policy. ✓
- The `aep` namespace is removed from protocol surfaces. ✓
- No regressions in the frozen event substrate. ✓

The Event layer's forward work is done. Effort has moved up to the [Coordination layer](coordination-layer.md) and [Adaptation layer](adaptation-layer.md).
