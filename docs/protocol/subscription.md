# Harmovela Subscription Model

> Status: draft. Part of the Harmovela 0.2 core specification.
> Category: core

## Purpose

Define how consumers express interest in event streams and how producers route events to subscribers based on filter criteria.

## Subscription Filter

A subscription filter describes which events a consumer wants to receive. All filter fields are optional; an absent field means "match everything."

```json
{
  "types": ["memory.*", "context.*"],
  "source": ["memory:main"],
  "target": "agent:researcher",
  "topic": "tasks.task_01",
  "session_id": "sess_01",
  "conversation_id": "conv_01",
  "task_id": "task_01",
  "from_cursor": "stream_01:42",
  "delivery_mode": "at_least_once"
}
```

| Field | Type | Description |
|---|---|---|
| `types` | string or string[] | Event type patterns to match |
| `source` | string or string[] | Event source identity |
| `target` | string or string[] | Event target identity |
| `topic` | string or string[] | Routing topic |
| `session_id` | string or string[] | Session scope |
| `conversation_id` | string or string[] | Conversation scope |
| `task_id` | string or string[] | Task scope |
| `from_cursor` | string | Replay starting point |
| `delivery_mode` | string | Requested delivery guarantee |

Each string-valued field accepts a single string or an array of strings. An event matches the field if its corresponding envelope field equals any value in the filter array.

### Type Pattern Matching

The `types` filter uses dotted pattern matching:

| Pattern | Matches |
|---|---|
| `"*"` | All event types |
| `"memory.*"` | All `memory.*` events (e.g., `memory.fact.added`, `memory.episode.stored`) |
| `"tool.call.*"` | All `tool.call.*` events |
| `"tool.*.progress"` | `tool.call.progress`, `tool.any.progress` |
| `"task.progress"` | Exact match only |

Rules:
- Patterns are compared as segments delimited by `.`.
- `*` matches exactly one segment.
- A trailing `.*` matches any number of trailing segments.
- A leading `*` (single `*` with no prefix) matches all types.
- Patterns are case-sensitive.

### Combined Filtering

An event matches a subscription when **all** specified filter fields match. If no filter fields are specified (empty filter object), the subscription matches no events.

Implementation must require at least one of `types`, `source`, `target`, or `topic`.

## Subscription Lifecycle

```
subscription.requested
       │
       ├──► subscription.created
       │          │
       │          ├──► subscription.cancelled
       │          │
       │          └──► subscription.expired
       │
       └──► subscription.rejected
```

### `subscription.requested`

Sent by a consumer to request a new subscription.

Payload: a filter object as defined above. At least one of `types`, `source`, `target`, or `topic` must be present.

### `subscription.created`

Sent by the producer to confirm a subscription.

```json
{
  "type": "subscription.created",
  "payload": {
    "subscription_id": "sub_0001",
    "filter": { "types": ["memory.*"], "target": "agent:researcher" },
    "created_at": "2026-07-09T10:00:00Z",
    "expires_at": null
  }
}
```

Required payload fields: `subscription_id`, `filter`.

### `subscription.rejected`

Sent by the producer when a subscription cannot be created.

```json
{
  "type": "subscription.rejected",
  "payload": {
    "subscription_id": "sub_0001",
    "filter": {},
    "error": {
      "code": "subscription_rejected",
      "message": "subscription must include at least one filter criterion",
      "retryable": false
    }
  }
}
```

### `subscription.cancelled`

Sent by the consumer to cancel an active subscription. The producer should stop delivering events for this subscription and may send a final `subscription.cancelled` confirmation.

```json
{
  "type": "subscription.cancelled",
  "payload": {
    "subscription_id": "sub_0001"
  }
}
```

After cancellation, events in flight may still be delivered. Consumers must handle this gracefully.

### `subscription.expired`

Sent by the producer when a subscription reaches its expiry time. Same semantics as cancellation but initiated by the producer.

## Delivery Modes

| Mode | Guarantee | Use Case |
|---|---|---|
| `best_effort` | At most once. May be dropped. | Transient UI updates, progress events |
| `at_least_once` | Durable. May deliver duplicates. | Task results, memory updates |
| `replayable` | Cursor-based replay supported. | Late-joining consumers, recovery |

The delivery mode is declared in the subscription filter as `delivery_mode`. The actual delivery mode may be downgraded by the producer; the producer must include the effective delivery mode on each delivered event envelope under `delivery.mode`.

## Cursor Semantics

A `from_cursor` value requests replay from a specific position in the event stream. The cursor format is transport-specific. A producer that does not support replay must reject the subscription with code `subscription_rejected` and detail `"replay not supported"`.

## Implementation Notes

- Implementations should validate filter fields on `subscription.requested` before creating the subscription.
- Subscriptions are scoped to a session. Cancelling or closing a session must implicitly cancel all subscriptions created in that session.
- The `subscription_id` is assigned by the producer and must be unique within a session.
