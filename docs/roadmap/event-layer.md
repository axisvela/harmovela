# Event Layer — Foundation

> Part of the [Harmovela roadmap](../roadmap.md). This layer answers **"What happened?"** — the typed, correlatable communication substrate that everything else builds on.

**Autonomy mapping:** L0 (event-aware agent).

**Status:** Delivered and stable. This is the frozen baseline of the protocol.

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
| 5. Reliability and production semantics | Replay cursors, acknowledgement protocol, dead-letter events, retry policy, authorization and multi-tenant routing models |
| 6. Ecosystem and governance | Public spec site, compatibility test suite, conformance levels, event-registry governance, contribution guide, code of conduct |
| 7. Agent semantics and positioning | Differentiation document, agent-runtime-semantics spec, 15 agent-runtime metadata fields, six new event families, cross-language fixtures |
| 8. Delivery end-to-end conformance | AEP-C3 level with `delivery_e2e`, full DeliveryTracker traces in all four languages, payload schema validation |

## Current State

The protocol covers 17 specifications, 4 conformance levels (C0–C3), 7 cross-language fixtures, 4 transport bindings, ~370 tests across four languages, and a published spec site at https://axisrobo.github.io/harmovela/. The default conformance target is AEP-C3 with DeliveryTracker integration in every language. A networked PostgreSQL delivery-store backend ships in all four languages alongside the in-memory and SQLite backends.

## Remaining Foundation Work

The Event layer is functionally complete. The only open item is identity, tracked as the release-path **0.1 Transition**:

- Establish **Harmovela** as the public protocol identity in all documentation.
- Give legacy technical identifiers (schema URIs, wire version fields, package names, `AEP-C*` levels) an explicit compatibility policy.
- Document the migration sequence for protocol identity, schema identifiers, package names, and repository paths — without silently changing wire behavior or delivery guarantees.

Real artifact names such as `schemas/aep-envelope.schema.json` and `AEP-C3` remain valid until that versioned migration completes.

## Exit Criteria

- Public documentation consistently identifies Harmovela as the protocol.
- Legacy technical identifiers have an explicit, versioned compatibility policy.
- No regressions in the frozen event substrate.

Once the identity migration is documented, the Event layer's forward work is done and effort concentrates on the [Coordination layer](coordination-layer.md).
