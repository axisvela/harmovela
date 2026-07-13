# Harmovela Profiles

> Status: draft. Part of the Harmovela 0.2 specification.

## Purpose

Define optional capability bundles (profiles) that may be adopted independently from the core protocol. Profiles allow implementations to declare and negotiate capabilities beyond the minimum conformance baseline without requiring every implementation to support every feature.

## Profile Model

### Identifier

Each profile has a unique string identifier following the pattern `harmovela.<domain>.<name>.<version>`, for example `harmovela.delivery.v1`. Profile identifiers are stable within a major version and must not change semantics in a backward-incompatible way without a version bump.

### Dependencies

A profile may declare dependencies on other profiles or on core conformance levels. Dependencies are transitive: adopting a profile implies adopting all profiles it depends on.

| Profile | Depends On |
|---|---|
| `harmovela.delivery.v1` | Core HARMOVELA-C0 + HARMOVELA-C1 |
| `harmovela.security.v1` | Core HARMOVELA-C0 + HARMOVELA-C1 |
| `harmovela.runtime-semantics.v1` | Core HARMOVELA-C0 + HARMOVELA-C1 |
| `harmovela.transport.websocket.v1` | Core HARMOVELA-C0 |
| `harmovela.transport.sse.v1` | Core HARMOVELA-C0 |
| `harmovela.transport.grpc.v1` | Core HARMOVELA-C0 |
| `harmovela.transport.nats.v1` | Core HARMOVELA-C0 |
| `harmovela.transport.kafka.v1` | Core HARMOVELA-C0 |
| `harmovela.transport.redis-streams.v1` | Core HARMOVELA-C0 |

### Capability Negotiation

During session initialization, a peer declares supported profiles in `capabilities.profiles`:

```json
{
  "capabilities": {
    "aep_version": "0.2",
    "profiles": [
      "harmovela.delivery.v1",
      "harmovela.security.v1",
      "harmovela.transport.websocket.v1"
    ]
  }
}
```

Both sides negotiate a shared profile set. If a required profile is not supported by the peer, the session must not become ready. The peer should send `session.error` with code `unsupported_profile` and `details.required` listing the unavailable profiles.

### Versioning

Profiles version independently of the protocol envelope and of each other. A profile version bump indicates one of:

- Addition of new required behavior within the profile.
- Removal or backward-incompatible change to existing behavior.
- Change in dependency requirements.

Implementations should reject requests requiring an unsupported profile version.

### Conformance Requirements

Each profile defines its own conformance requirements through the standard conformance levels (HARMOVELA-C0 through HARMOVELA-C3) plus profile-specific test fixtures. A profile conformance manifest lives under `conformance/profiles/<profile-id>/manifest.json`.

## Conformance

### Profile Declaration in manifest.json

Profiles are declared in the top-level `profiles` object of `conformance/manifest.json`:

```json
{
  "profiles": {
    "delivery": {
      "display_name": "Durable Delivery",
      "description": "At-least-once and replayable delivery...",
      "fixtures": [
        "fixtures/delivery.ndjson",
        "fixtures/delivery-stateful.ndjson",
        "fixtures/delivery-e2e.ndjson"
      ]
    }
  }
}
```

Each fixture may declare a `profile` field to associate itself with a specific profile. Fixtures without a `profile` field are considered core fixtures and are always run.

### Profile Filtering in Conformance Runner

The conformance runner supports `--profile=<name>` to run only fixtures belonging to a specific profile, plus all core fixtures (those without a `profile` field). When profile filtering is active:

1. Core fixtures (no `profile` field) are always included.
2. Only fixtures whose `profile` field matches the selected profile AND whose path appears in the profile's `fixtures` list are included.
3. Fixtures belonging to other profiles are excluded.

Example: `--profile=delivery` runs core fixtures plus the three delivery-specific fixtures.

This filtering behavior is available in:

- **Cross-language runner:** `node tools/conformance-runner.js --profile=delivery`
- **TypeScript CLI:** `node implementations/typescript/src/cli/harmovela.js conformance --profile=delivery`
- **Python CLI:** `cd implementations/python && python -m aep.cli.main conformance --profile=delivery`
- **Go CLI:** `cd implementations/go && go run ./cmd/aep conformance --profile=delivery`
- **Java CLI:** `cd implementations/java && mvn -q exec:java -Dexec.mainClass=com.axisrobo.aep.cli.HarmovelaCli -Dexec.args="conformance --profile=delivery"`

## Profile Catalog

## Dimension Contract Ownership

| Dimension | Contract document |
|---|---|
| Event | [Event contract](event-contract.md) |
| Governance | [Governance contract](governance-contract.md) |

### Core Profile

**Identifier:** `harmovela.core.v1`

**Conformance:** HARMOVELA-C0 + HARMOVELA-C1

**Scope:** Protocol envelope, session lifecycle, subscription model, task lifecycle, error model, event routing. Every conformant Harmovela implementation must satisfy the core profile.

**Covered specifications:**
- Envelope validation (HARMOVELA-C0)
- Session open, ready, heartbeat, error, close (HARMOVELA-C1)
- Subscription creation, validation, cancellation, matching (HARMOVELA-C1)
- Task lifecycle (accepted, started, progress, blocked, resumed, completed, failed, cancelled, timed out) (HARMOVELA-C1)
- Standard error payloads for invalid protocol actions (HARMOVELA-C1)
- Event routing by type, source, target, topic, session, task, metadata (HARMOVELA-C1)

### Delivery Profile

**Identifier:** `harmovela.delivery.v1`

**Conformance:** HARMOVELA-C2 + HARMOVELA-C3

**Scope:** Durable delivery, acknowledgement and negative acknowledgement, dead-letter, replay, delivery tracking statistics.

**Covered specifications:**
- Delivery sequence and cursor tracking (HARMOVELA-C2)
- Acknowledgement (ack) and negative acknowledgement (nack) processing (HARMOVELA-C2)
- Retry policy with configurable backoff and max attempts (HARMOVELA-C2)
- Dead-letter routing for exhausted deliveries (HARMOVELA-C2)
- Replay behavior with observable event sequences (HARMOVELA-C2)
- End-to-end tracking events (published, dispatched, delivered, acknowledged) (HARMOVELA-C3)
- DeliveryTracker stats (in-flight, acknowledged, dead-letter, latency percentiles) (HARMOVELA-C3)
- Dead-letter replay with batch window and rate limiting (HARMOVELA-C3)
- Nack with actionable error codes for selective retry (HARMOVELA-C3)

### Security Profile

**Identifier:** `harmovela.security.v1`

**Conformance:** HARMOVELA-C0 + HARMOVELA-C1

**Scope:** Identity, authorization, audit, tenant isolation.

**Covered specifications:**
- Identity: peer identity verification and mutual authentication.
- Authorization: capability-based access control for events, subscriptions, and tasks. Peers declare authorized actions; unauthorized actions receive `event.rejected` with code `unauthorized`.
- Audit: structured audit events for all protocol state transitions (session open, subscription create, task state change, delivery acknowledgement). Audit events carry actor identity, timestamp, and affected resource.
- Tenant isolation: events, subscriptions, and tasks are scoped to a tenant. Cross-tenant access is prohibited unless explicitly authorized. Transport-level isolation (separate connections, namespaces, or topics) is recommended.

### Runtime Semantics Profile

**Identifier:** `harmovela.runtime-semantics.v1`

**Conformance:** HARMOVELA-C0 + HARMOVELA-C1

**Scope:** Agent-oriented runtime semantics including belief, freshness, delegation, interruption, compensation, and provenance.

**Covered specifications:**
- Belief: an agent may declare beliefs about world state as structured assertions. Beliefs carry confidence, source, and expiration metadata.
- Freshness: event producers attach freshness constraints (max age, staleness window). Stale events are flagged or rejected by the runtime.
- Delegation: tasks may be delegated from one agent to another. Delegation preserves task identity and establishes a delegation chain with accountability.
- Interruption: a running task may be interrupted by a higher-priority event. Interruption semantics include save-point, rollback, and resume.
- Compensation: completed tasks may define compensating actions for rollback scenarios. Compensation events are triggered on failure or explicit reversal.
- Provenance: every event carries optional provenance metadata (origin agent, transformation chain, lineage identifiers) for traceability.

### Transport Profiles

Transport profiles define wire-level bindings for Harmovela communication. Each transport profile is independent and optional. An implementation may support zero or more transport profiles.

| Profile ID | Transport | Specification |
|---|---|---|
| `harmovela.transport.stdio.v1` | stdio | `docs/protocol/transport-stdio.md` |
| `harmovela.transport.websocket.v1` | WebSocket | `docs/protocol/transport-websocket.md` |
| `harmovela.transport.sse.v1` | HTTP SSE | `docs/protocol/transport-sse.md` |
| `harmovela.transport.grpc.v1` | gRPC streaming | `docs/protocol/transport-grpc.md` |
| `harmovela.transport.nats.v1` | NATS | `docs/protocol/transport-nats.md` |
| `harmovela.transport.kafka.v1` | Kafka | `docs/protocol/transport-kafka.md` |
| `harmovela.transport.redis-streams.v1` | Redis Streams | `docs/protocol/transport-redis-streams.md` |

Each transport profile specification defines framing rules, connection lifecycle, error handling for transport-level failures, and subprotocol or content-type identifiers.

## Profile Declaration in Capability Negotiation

Profiles are declared during session establishment in the `capabilities` object. The negotiation flow:

1. Client sends `session.open` with `capabilities.profiles` listing supported profiles and versions.
2. Server responds with `session.opened` containing the intersection of supported profiles.
3. Client sends `session.ready` confirming the negotiated profile set.
4. If a required profile is absent from the intersection, either peer sends `session.error` with code `unsupported_profile`.

Example negotiation:

```json
// Client → Server: session.open
{
  "type": "session.open",
  "aep_version": "0.2",
  "capabilities": {
    "aep_version": "0.2",
    "profiles": [
      "harmovela.core.v1",
      "harmovela.delivery.v1",
      "harmovela.security.v1"
    ]
  }
}

// Server → Client: session.opened
{
  "type": "session.opened",
  "aep_version": "0.2",
  "session_id": "sess-abc123",
  "capabilities": {
    "aep_version": "0.2",
    "profiles": [
      "harmovela.core.v1",
      "harmovela.delivery.v1"
    ]
  }
}

// Client → Server: session.ready (accepts negotiated set)
{
  "type": "session.ready",
  "session_id": "sess-abc123"
}
```

In this example, the security profile was not supported by the server and was dropped from the negotiated set. The client accepted the reduced set by sending `session.ready`. If the client required the security profile, it would instead send `session.error` with code `unsupported_profile`.
