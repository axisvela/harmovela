# Harmovela Reliability Model

> Status: draft. Part of the Harmovela 0.2 delivery profile.

## Purpose

Define retry policies, dead-letter handling, and durability guarantees for Harmovela event delivery.

## Retry Policy

Events may carry retry policy metadata in the delivery block:

```json
{
  "delivery": {
    "mode": "at_least_once",
    "sequence": 42,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000,
      "backoff_multiplier": 2,
      "max_backoff_ms": 30000,
      "ack_timeout_ms": 30000
    }
  }
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `max_attempts` | number | 3 | Maximum delivery attempts before dead-letter |
| `backoff_ms` | number | 1000 | Initial backoff delay in milliseconds |
| `backoff_multiplier` | number | 2 | Exponential backoff multiplier |
| `max_backoff_ms` | number | 30000 | Maximum backoff ceiling |
| `ack_timeout_ms` | number | 30000 | Time to wait for `event.acknowledged` |

### Backoff Calculation

```
delay_n = min(backoff_ms × backoff_multiplier^(n-1), max_backoff_ms)
```

Where `n` is the 1-indexed attempt number.

### Retry Flow

```
Producer sends event (attempt 1)
  → waits ack_timeout_ms
  → no ack received
Producer waits backoff_ms × backoff_multiplier^(1-1) = backoff_ms
Producer resends event (attempt 2) with event.redelivered
  → waits ack_timeout_ms
  → no ack received
Producer waits backoff_ms × backoff_multiplier^(2-1) = backoff_ms × 2
Producer sends event (attempt 3, max_attempts reached)
  → no ack received
Producer dead-letters the event
```

## Dead-Letter Events

When an event cannot be delivered within `max_attempts`, the producer emits a dead-letter event:

```json
{
  "type": "event.dead_lettered",
  "payload": {
    "original_event_id": "evt_01JZ0000000000000000000000",
    "subscription_id": "sub_0001",
    "target": "agent:researcher",
    "attempts": 3,
    "last_attempt_at": "2026-07-09T10:05:00Z",
    "last_error": {
      "code": "session_error",
      "message": "consumer disconnected"
    },
    "original_event": { "aep_version": "0.1", ... }
  }
}
```

The dead-letter event:
- Carries the full original event in `original_event` for inspection.
- Records all delivery attempts and the last error.
- Is delivered to a designated dead-letter subscription or stored for administrator review.

## Durability Guarantees

Durability is declared per-delivery, not per-transport:

| Delivery Mode | Durability | Impact |
|---|---|---|
| `best_effort` | None | Event lost if consumer is unavailable |
| `at_least_once` | Durable until acked | Producer must persist events until acknowledged |
| `replayable` | Durable with history | Producer must retain events for replay window |

Producers must declare their durability support in `session.ready` capabilities:

```json
{
  "capabilities": {
    "delivery": {
      "modes": ["best_effort", "at_least_once", "replayable"],
      "replay_window_ms": 86400000,
      "max_retention_events": 1000000,
      "dead_letter_support": true
    }
  }
}
```

| Field | Description |
|---|---|
| `replay_window_ms` | Maximum age of events available for replay |
| `max_retention_events` | Maximum number of events retained for replay |
| `dead_letter_support` | Whether the producer supports dead-letter queues |

## Subscription-Level Delivery Tracking

A producer tracks delivery state per subscription:

```
subscription_id: sub_0001
  mode: at_least_once
  last_sequence: 99
  last_acknowledged_cursor: stream_01:95
  pending_acks:
    - event_id: evt_01  sequence: 96  attempts: 1  next_retry_at: 2026-07-09T10:00:31Z
    - event_id: evt_02  sequence: 97  attempts: 1  next_retry_at: 2026-07-09T10:00:31Z
    - event_id: evt_03  sequence: 98  attempts: 2  next_retry_at: 2026-07-09T10:00:58Z
```

When a consumer acknowledges `evt_01` and `evt_02`, they are removed from pending. The cursor advances to `stream_01:97`. If a consumer reconnects from a prior cursor, all events after that cursor are redelivered.

## Implementation Notes

- Retry policy metadata on events is advisory. Producers may override with their own policies.
- Dead-letter events should use a standard error payload following the [error model](./error-model.md).
- The durability model is best-effort for in-process implementations. Production deployments should persist events in a durable store. Reference implementations ship three delivery-store backends per language: an in-memory store, an embedded SQLite store, and a networked `PostgresDeliveryStore` for shared, multi-process production deployments.
- Cursor format is opaque. Consumers should treat cursors as strings and not parse or interpret them.
- Authorization, identity verification, and multi-tenant isolation are defined in the [security model](./security.md).
