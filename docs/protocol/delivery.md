# Harmovela Delivery Semantics

> Status: draft. Part of the Harmovela 0.2 core specification.
> Category: core

## Purpose

Define the event delivery contract between producer and consumer across all transports, including acknowledgement, sequence tracking, and replay.

## Delivery Modes

| Mode | Delivery | Duplicates | Replay | Use Case |
|---|---|---|---|---|
| `best_effort` | At most once | No | No | Transient UI updates, heartbeat |
| `at_least_once` | Always delivered | Possible | No | Task results, memory facts |
| `replayable` | Always delivered | Possible | Yes (cursor) | Late-joining consumers, audit |

Delivery mode is declared in the subscription filter as `delivery_mode` and carried on each event under `delivery.mode`.

## Event Identity

Every event has a globally unique `id`. Consumers use the `id` for idempotent processing:

- Process each event at most once based on `id`.
- If a duplicate arrives, acknowledge it without re-processing.

## Acknowledgement Protocol

### AEP-level Acknowledgement

When a consumer has successfully processed an event, it sends:

```json
{
  "type": "event.acknowledged",
  "causation_id": "evt_01JZ0000000000000000000000",
  "payload": {
    "acknowledged_event_id": "evt_01JZ0000000000000000000000",
    "cursor": "stream_01:42"
  }
}
```

- `acknowledged_event_id` — the `id` of the event being acknowledged.
- `cursor` — optional; the stream position after this event, for replay bookmarking.

### Rejection

When a consumer cannot process an event:

```json
{
  "type": "event.rejected",
  "causation_id": "evt_01JZ0000000000000000000000",
  "payload": {
    "acknowledged_event_id": "evt_01JZ0000000000000000000000",
    "error": {
      "code": "protocol_error",
      "message": "unexpected event type for current state"
    }
  }
}
```

### Ack Expectations

- `best_effort`: No ack expected. Producer fires and forgets.
- `at_least_once`: Producer expects `event.acknowledged` within a timeout. If no ack, the event may be redelivered.
- `replayable`: Same as `at_least_once`, with cursor tracking.

## Sequence Tracking

Each event in a delivery stream carries a sequence number:

```json
{
  "delivery": {
    "mode": "at_least_once",
    "sequence": 42,
    "cursor": "stream_01:42"
  }
}
```

- `sequence` — monotonically increasing integer per stream. Gaps indicate lost or skipped events.
- `cursor` — opaque string identifying a position in the event stream, used for replay.

The cursor format is transport-specific and opaque to consumers. Common formats:

| Transport | Cursor Format |
|---|---|
| stdio | Not applicable (no replay) |
| WebSocket | `<stream_id>:<sequence>` |
| HTTP SSE | Event `id` from SSE protocol |
| NATS/Kafka | Native offset or timestamp |

## Replay

A consumer replays events by subscribing with `from_cursor`:

```json
{
  "types": ["task.*"],
  "from_cursor": "stream_01:42",
  "delivery_mode": "replayable"
}
```

The producer:
1. Finds the stream position matching the cursor.
2. Delivers all events from that position forward (including the event at the cursor position if `from_cursor` is inclusive).
3. Transitions to live delivery once caught up.

When replay is complete and the stream is caught up, the producer may send:

```json
{
  "type": "event.replayed",
  "payload": {
    "from_cursor": "stream_01:42",
    "to_cursor": "stream_01:99",
    "events_replayed": 57
  }
}
```

## Redelivery

When a consumer disconnects before acknowledging events, the producer may redeliver unacknowledged events on reconnect. Redelivered events carry:

```json
{
  "type": "event.redelivered",
  "payload": {
    "original_event_id": "evt_01JZ0000000000000000000000",
    "attempt": 2
  }
}
```

The `attempt` field counts 1-indexed delivery attempts for the same event.

## Implementation Notes

- Producers must maintain at least the last acknowledged cursor per subscription.
- Consumers must track their last processed cursor and provide it on reconnect or re-subscription.
- The ack timeout is implementation-defined but should be reasonable (default 30s).
- Event `id` must be unique; implementors should use a format like `evt_<ULID>` or `evt_<UUID v7>`.
