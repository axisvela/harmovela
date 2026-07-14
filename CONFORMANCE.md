# Harmovela Conformance Matrix

> Status: 0.4 Beta. Last verified: 2026-07-14.

## Core Conformance Levels

| Level | TypeScript | Python | Go | Java |
|-------|-----------|--------|-----|------|
| HARMOVELA-C0 | PASS | PASS | PASS | PASS |
| HARMOVELA-C1 | PASS | PASS | PASS | PASS |
| HARMOVELA-C2 | PASS | PASS | PASS | PASS |
| HARMOVELA-C3 | PASS | PASS | PASS | PASS |

**HARMOVELA-C0 (Envelope and Schema):** Parse envelopes, validate shared schema assets (`schemas/harmovela-envelope.schema.json`, `schemas/harmovela-payloads.schema.json`), reject invalid envelopes and unknown event types.

**HARMOVELA-C1 (Core Runtime):** Session lifecycle (open, ready, heartbeat, error, close), subscription creation/validation/cancellation, event routing by type/source/target/topic/session/task/metadata, task lifecycle (submitted → accepted → started → progress → blocked → resumed → output → completed/failed/cancelled/timed_out), standard error payloads.

**HARMOVELA-C2 (Delivery and Reliability):** Delivery sequence and cursor tracking, acknowledgement (`event.acknowledged`) and rejection (`event.rejected`) processing, retry policy with configurable backoff and max attempts, dead-letter routing for exhausted deliveries, replay behavior with observable event sequences.

**HARMOVELA-C3 (End-to-End Delivery Tracking):** Tracking events (published, dispatched, delivered, acknowledged) with timestamps, sequence, and cursors; at-least-once delivery with idempotent event receipt; dead-letter with full metadata preservation; DeliveryTracker statistics (in-flight, acknowledged, dead-letter, latency percentiles); dead-letter replay with batch window and rate limiting; nack events with actionable error codes.

## Profile Conformance

### Core Profile (`harmovela.core.v1`)

Conformance: HARMOVELA-C0 + HARMOVELA-C1. Every conformant implementation must satisfy the core profile.

### Delivery Profile (`harmovela.delivery.v1`)

| Level | TypeScript | Python | Go | Java |
|-------|-----------|--------|-----|------|
| HARMOVELA-C2 | PASS | PASS | PASS | PASS |
| HARMOVELA-C3 | PASS | PASS | PASS | PASS |

Conformance: HARMOVELA-C2 + HARMOVELA-C3. Durable delivery, acknowledgement and negative acknowledgement, dead-letter, replay, delivery tracking statistics.

### Runtime Semantics Profile (`harmovela.runtime-semantics.v1`)

| Level | TypeScript | Python | Go | Java |
|-------|-----------|--------|-----|------|
| HARMOVELA-C0* | PASS | PASS | PASS | PASS |

*Runtime semantics profile uses envelope-level HARMOVELA-C0 fixture validation for belief, freshness, delegation, interruption, compensation, and provenance metadata events.

### Coordination Profile (`harmovela.coordination.v1`)

| Level | TypeScript | Python | Go | Java |
|-------|-----------|--------|-----|------|
| HARMOVELA-C1 | PASS | PASS | PASS | PASS |

Conformance: HARMOVELA-C1. Task lifecycle state-machine enforcement, state freshness and invalidation semantics, delegation ownership, handoff, escalation, and cancellation propagation.

## Implementation Details

| Language | Package | Test Files | Conformance Runner |
|----------|---------|-----------|-------------------|
| TypeScript | `@axisrobo/harmovela-event` (v0.1.0-draft) | 42 | `cd implementations/typescript && npm run conformance` |
| Python | `harmovela-reference-python` | 45 | `cd implementations/python && python -m harmovela_cli.main conformance` |
| Go | `github.com/axisrobo/harmovela` | 37 | `cd implementations/go && go run ./cmd/harmovela conformance` |
| Java | `com.axisrobo.harmovela` (JDK 21) | 38 | `cd implementations/java && mvn exec:java -Dexec.mainClass=com.axisrobo.harmovela.cli.HarmovelaCli -Dexec.args="conformance"` |

## Conformance Fixtures

25 shared fixtures in `conformance/fixtures/`, categorised by level and profile:

| Level | Fixture Count | Fixtures |
|-------|:---:|----------|
| HARMOVELA-C0 | 8 | `negative.ndjson`, `reject-some-protocol.ndjson`, `reject-some-payload.ndjson`, `memory-context-ack.ndjson`, `governance-contract.ndjson`, `tenant-isolation-negative.ndjson`, `agent-runtime-semantics.ndjson`, `task-invalid-transitions.ndjson` |
| HARMOVELA-C1 | 12 | `task-lifecycle.ndjson`, `session-flow.ndjson`, `event-contract.ndjson`, `event-core.ndjson`, `tenant-isolation-positive.ndjson`, `task-blocked-resume.ndjson`, `task-timed-out.ndjson`, `core-lifecycle.ndjson`, `task-output.ndjson`, `task-failed.ndjson`, `task-cancelled.ndjson`, `task-cancel-requested.ndjson` |
| HARMOVELA-C2 (delivery) | 2 | `delivery.ndjson`, `delivery-stateful.ndjson` |
| HARMOVELA-C3 (delivery) | 1 | `delivery-e2e.ndjson` |
| Coordination profile | 2 | `delegation-positive.ndjson`, `delegation-negative.ndjson` |

7 transport bindings implemented across all four languages: stdio, WebSocket, SSE, gRPC, NATS, Kafka, Redis Streams.

## How to Verify

```sh
# All core + all profiles:
node tools/conformance-runner.js

# Core only:
node tools/conformance-runner.js --profile=default

# Specific profile:
node tools/conformance-runner.js --profile=delivery
node tools/conformance-runner.js --profile=runtime-semantics
node tools/conformance-runner.js --profile=coordination
```

## Interpretation

- **PASS**: All fixtures at the declared level validate correctly with zero failures.
- **FAIL**: At least one fixture fails envelope/schema validation or harness flow.
- **SKIP**: Not applicable (e.g. profile not implemented or unsupported level).

## Related Documents

- [Conformance Specification](docs/protocol/conformance.md) — conformance levels and fixture expectations
- [Profiles](docs/protocol/profiles.md) — profile model, dependencies, capability negotiation
- [Event Registry Governance](docs/protocol/event-registry-governance.md) — standard event type registry
