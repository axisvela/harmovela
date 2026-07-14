# Harmovela Transport Binding: NATS

> Status: draft. Part of the Harmovela 0.2 transport-nats profile.

## Purpose

Define how Harmovela runs over NATS, supporting subject-based publish/subscribe with optional JetStream durability.

## Framing

Harmovela over NATS uses JSON-encoded Harmovela events as NATS message bodies:

- Each NATS message body is a complete, valid JSON-encoded Harmovela event.
- Messages are delivered via NATS subject-based routing.
- The transport does not fragment events across multiple messages.

## Subject Mapping

Harmovela topics map to NATS subjects using a configurable prefix:

| Harmovela context | NATS subject pattern | Example |
|---|---|---|
| Topic `tasks.task_01` | `aep.tasks.task_01` | `aep.tasks.task_01` |
| Source `agent:researcher` | `aep.agent.researcher` | `aep.agent.researcher` |
| Wildcard subscription `task.*` | `aep.task.>` | `aep.task.>` |
| Session-scoped | `aep.sess.<session_id>` | `aep.sess.sess_01` |

The default subject prefix is `aep`. Implementations should make this configurable.

### Subject Construction

| Pattern | Behavior |
|---|---|
| `aep.type.<type>` | Route by event type (e.g. `aep.type.task.progress`) |
| `aep.source.<source>` | Route by event source |
| `aep.topic.<topic>` | Route by explicit Harmovela topic |
| `aep.sess.<session_id>` | Route to all events for a session |
| `aep.conv.<conversation_id>` | Route to all events for a conversation |

Producers should publish on the most specific subject. Consumers subscribe with wildcards.

## Delivery Modes

### Core NATS (Best Effort)

- `best_effort`: fire-and-forget publish. No acknowledgement or replay guarantee.
- Messages are lost if no consumer is subscribed at publish time.

### JetStream (At Least Once, Replayable)

- `at_least_once`: JetStream consumer with explicit ack. Messages are persisted and re-delivered on timeout.
- `replayable`: JetStream stream with configurable retention. Consumers replay from any sequence number.

### Delivery Mode Selection

| Harmovela Delivery Mode | NATS Mechanism |
|---|---|
| `best_effort` | Core NATS publish |
| `at_least_once` | JetStream push consumer with `AckWait` |
| `replayable` | JetStream pull consumer with `DeliverPolicy` |

## Session Lifecycle

| NATS State | Session State |
|---|---|
| Connection established | `CREATED` |
| First subscription created | `OPENED` |
| Capability negotiation complete | `READY` |
| Connection drain + close | `CLOSED` |
| Connection lost (no reconnect) | `ERROR` |

## Connection

The transport should support:

- `nats://localhost:4222` (default)
- TLS via `tls://` URLs
- Authentication via NKey, token, or credentials file
- Auto-reconnect with configurable max attempts

## Implementation Notes

### Core NATS

- Use `nats.Conn.Subscribe(subject, handler)` for inbound.
- Use `nats.Conn.Publish(subject, data)` for outbound.
- Each inbound NATS message is parsed as JSON into a Harmovela envelope.
- Malformed JSON should emit an error event but not crash the subscription.

### JetStream

- Use `js.AddStream(&nats.StreamConfig{...})` to create a stream on first use.
- Use `js.Subscribe(subject, handler, ...opts)` for durable consumers.
- Ack after successful envelope validation.
- Nack on parse failure to trigger redelivery.

## References

- [NATS Documentation](https://docs.nats.io/)
- [NATS Go Client](https://github.com/nats-io/nats.go)
