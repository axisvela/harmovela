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
| `harmovela.coordination.v1` | `harmovela.core.v1` + `harmovela.security.v1` |
| `harmovela.adaptation.v1` | `harmovela.coordination.v1` + `harmovela.security.v1` |
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
- **Python CLI:** `cd implementations/python && python -m axisrobo_harmovela.cli.main conformance --profile=delivery`
- **Go CLI:** `cd implementations/go && go run ./cmd/harmovela conformance --profile=delivery`
- **Java CLI:** `cd implementations/java && mvn -q exec:java -Dexec.mainClass=com.axisrobo.harmovela.cli.HarmovelaCli -Dexec.args="conformance --profile=delivery"`

## Dimension Contract Ownership

| Dimension | Contract document |
|---|---|
| Event | [Event contract](event-contract.md) |
| Recovery | [Delivery](delivery.md) + [Reliability](reliability.md) |
| Governance | [Governance contract](governance-contract.md) + [Security](security.md) |
| Task | [Task lifecycle](task-lifecycle.md) |
| State | [Event dimension classification](event-dimension-classification.md#state-dimension) |
| Context / Memory | [Event dimension classification](event-dimension-classification.md#context--memory-dimension) |
| Delegation | [Agent runtime semantics](agent-runtime-semantics.md#delegation-and-handoff) + [Coordination profile](profiles.md#coordination-profile-l2-multi-agent-collaboration-and-delegation) |
| Tool | [Event dimension classification](event-dimension-classification.md#tool-dimension) |
| Agent | [Event dimension classification](event-dimension-classification.md#agent-dimension) |
| Environment | [Event dimension classification](event-dimension-classification.md#environment-dimension) |
| Adaptation | [Adaptation feedback](adaptation-feedback.md) + [Adaptation budget](adaptation-budget.md) + [Governance contract](governance-contract.md#authorization-checks) |
| Command | [Command and Query](command-query.md#command) |
| Query | [Command and Query](command-query.md#query) |

## Profile Catalog

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

### Coordination Profile (L2 Multi-Agent Collaboration and Delegation)

**Identifier:** `harmovela.coordination.v1`

**Conformance:** HARMOVELA-C1

**Dependencies:** `harmovela.core.v1` + `harmovela.security.v1`

**Scope:** Task lifecycle state-machine enforcement, State freshness and invalidation semantics, Delegation ownership, handoff, escalation, and cancellation propagation, Command directed instruction lifecycle with negotiation windows, and Query directed information requests with snapshot-versioned responses.

This profile exists alongside `harmovela.runtime-semantics.v1`, which retains agent-oriented belief, freshness, interruption, compensation, and provenance semantics. Where runtime-semantics covers cognitive and epistemic concerns, coordination covers operational multi-agent collaboration: who owns work, how work transfers between agents, how stale state is detected and invalidated, and how cancellation cascades through a delegation tree.

**Covered specifications:**
- Task lifecycle: all legal state transitions (submitted→accepted→started→progress→blocked→resumed→output→completed | failed | cancelled | timed_out). Invalid transitions are rejected by the harness.
- State freshness and invalidation: context snapshots carry `valid_from` and `stale_after` metadata. Consumers may subscribe to `freshness.*` events. A stale state assertion triggers invalidation through the context dimension.
- Delegation ownership: a task may be delegated from one agent to another via `delegation.requested` → `delegation.accepted` → `delegation.handoff.completed`. Ownership transfer is atomic and trackable through a delegation chain. Handoff rejects (`delegation.rejected`) terminate the delegation flow for that target.
- Delegation escalation: a delegate may escalate a task to a supervisor via `delegation.escalated`. Escalation is only valid while the delegation is active (not after rejection).
- Cancellation propagation: when a parent task is cancelled, all child tasks must also be cancelled. The runtime emits `task.cancelled` for each child referencing the parent via `causation_id`. Cancellation is irreversible; a completed task cannot be cancelled.
- Command directed instructions: `command.requested` → `command.accepted`/`command.rejected` → `command.completed`/`command.failed`. Commands carry target agent, correlation_id, delegation chain, and authorization scope. Accepted commands must ack within negotiation window. Specified in [command-query.md](command-query.md).
- Query directed information requests: `query.requested` → `query.response`/`query.rejected` → `query.error`. Queries carry target, query scope, freshness requirements, and pagination hint. Responses carry snapshot version for idempotent re-query. Specified in [command-query.md](command-query.md).

### Adaptation Profile (L3 Production Autonomy)

**Identifier:** `harmovela.adaptation.v1`

**Conformance:** HARMOVELA-C1

**Dependencies:** `harmovela.coordination.v1` + `harmovela.security.v1`

**Scope:** Feedback/outcome correlation, protocol-level budget authority and enforcement, and adaptation-operation authorization and audit linkage. This is a C1-level optional profile that depends on both the coordination profile (for delegation and task-ownership semantics) and the security profile (for identity, authorization, audit, and tenant-isolation boundaries).

The adaptation profile extends the coordination layer with the capability to observe outcomes, enforce resource boundaries, and link adaptation operations to authority and audit records. It does not duplicate coordination, security, or event envelope behavior; it defines only the adaptation-specific extensions.

**Covered specifications:**
- Feedback correlation: outcome events that correlate each task outcome to its goal, delegation chain, authority, and declared and consumed cost. Event types: `adaptation.outcome.correlated`, `adaptation.goal.achieved`, `adaptation.goal.blocked`, `adaptation.cost.exceeded`. Specified in [adaptation feedback](adaptation-feedback.md).
- Budget authority: who may establish and change a budget (`budget.establish` capability), the enforcement point (harness-level check before each action dispatch), and structured events for budget lifecycle. Event types: `adaptation.budget.established`, `adaptation.budget.limit_approaching`, `adaptation.budget.limit_exceeded`. Specified in [adaptation budget](adaptation-budget.md).
- Authorization checks: the governance dimension enforces `budget.establish` and `budget.enforce` actions against the capability-based authorization model. No agent may establish a budget or trigger enforcement without the corresponding capability. Specified in [governance contract](governance-contract.md).
- Audit linkage: all adaptation feedback and budget events carry the standard audit metadata (actor identity, timestamp, affected resource, granted authority) and are subject to the same audit trail requirements as other governance-audited events. Specified in [security model](security.md).

**Negotiation:** An implementation declares adaptation support by including `harmovela.adaptation.v1` in `capabilities.profiles`. Because the adaptation profile depends on `harmovela.coordination.v1` and `harmovela.security.v1`, both must also be present in the negotiated profile set. If either dependency is absent, the session must not become ready.

**Profile family:** Adaptation feedback and budget events use the `adaptation.*` event family prefix, owned by the Governance dimension under the [event registry governance](event-registry-governance.md) model.

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
