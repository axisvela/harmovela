# AEP Protocol Design Draft

## Protocol Name

Working name: **AEP — Agent Event Protocol**.

Expanded scope: asynchronous events, async tool lifecycle, context events, memory events, and agent coordination messages.

## Core Message Envelope

Every AEP event uses a common envelope.

```json
{
  "aep_version": "0.1",
  "id": "evt_01JZ0000000000000000000000",
  "type": "tool.call.progress",
  "source": "tool:web_crawler",
  "target": "agent:researcher",
  "topic": "tasks.task_01",
  "session_id": "sess_01",
  "conversation_id": "conv_01",
  "task_id": "task_01",
  "correlation_id": "corr_01",
  "causation_id": "evt_01JYZZZZZZZZZZZZZZZZZZZZZZ",
  "created_at": "2026-07-09T10:00:00Z",
  "expires_at": null,
  "delivery": {
    "mode": "at_least_once",
    "sequence": 42,
    "cursor": "stream_01:42"
  },
  "payload_schema": "https://schemas.axisrobo.com/tool.call.progress.v1.json",
  "payload": {
    "message": "Indexed 120 of 500 pages",
    "progress": 0.24
  }
}
```

## Required Envelope Fields

- `aep_version`: protocol version
- `id`: globally unique event ID
- `type`: event type using dotted naming
- `source`: event producer identity
- `created_at`: event creation timestamp
- `payload`: event-specific body

## Recommended Envelope Fields

- `target`: intended consumer or audience
- `topic`: routing topic
- `session_id`: runtime session
- `conversation_id`: conversation or interaction thread
- `task_id`: related long-running task
- `correlation_id`: logical operation correlation key
- `causation_id`: event that caused this event
- `expires_at`: event relevance deadline
- `delivery`: delivery metadata
- `payload_schema`: schema URI for validation

## Event Type Naming

Event types use dotted namespaces:

```text
domain.object.action
```

Examples:

- `event.acknowledged`
- `subscription.created`
- `tool.call.requested`
- `tool.call.progress`
- `tool.call.completed`
- `memory.fact.invalidated`
- `context.snapshot.ready`
- `agent.message.sent`
- `environment.observed`

## Standard Event Families

### Session Events

- `session.opened`
- `session.ready`
- `session.heartbeat`
- `session.closed`
- `session.error`

### Capability Events

- `capabilities.requested`
- `capabilities.declared`
- `capabilities.changed`

### Subscription Events

- `subscription.requested`
- `subscription.created`
- `subscription.rejected`
- `subscription.cancelled`
- `subscription.expired`

### Delivery Events

- `event.acknowledged`
- `event.rejected`
- `event.redelivered`
- `event.replayed`
- `event.dead_lettered`

### Async Tool Events

- `tool.call.requested`
- `tool.call.accepted`
- `tool.call.rejected`
- `tool.call.started`
- `tool.call.progress`
- `tool.call.output`
- `tool.call.completed`
- `tool.call.failed`
- `tool.call.cancel.requested`
- `tool.call.cancelled`
- `tool.call.timed_out`

### Task Events

- `task.submitted`
- `task.accepted`
- `task.started`
- `task.blocked`
- `task.progress`
- `task.output`
- `task.completed`
- `task.failed`
- `task.cancel.requested`
- `task.cancelled`
- `task.timed_out`

### Context Events

- `context.updated`
- `context.invalidated`
- `context.snapshot.requested`
- `context.snapshot.ready`
- `context.retrieval.started`
- `context.retrieval.completed`
- `context.retrieval.failed`

### Memory Events

- `memory.fact.added`
- `memory.fact.updated`
- `memory.fact.invalidated`
- `memory.episode.stored`
- `memory.preference.updated`
- `memory.constraint.updated`
- `memory.summary.ready`
- `memory.retrieval.ready`

### Agent Message Events

- `agent.message.sent`
- `agent.message.received`
- `agent.message.failed`
- `agent.request.created`
- `agent.response.created`
- `agent.decision.recorded`

### Environment Events

- `environment.observed`
- `environment.changed`
- `environment.alerted`
- `environment.error`

## Async Tool Lifecycle

An async tool call is a task-like stream.

```text
tool.call.requested
tool.call.accepted
tool.call.started
tool.call.progress
tool.call.output
tool.call.completed
```

Failure path:

```text
tool.call.requested
tool.call.accepted
tool.call.started
tool.call.failed
```

Cancellation path:

```text
tool.call.cancel.requested
tool.call.cancelled
```

## Subscription Model

A subscription describes what a consumer wants to receive.

```json
{
  "types": ["memory.*", "tool.call.*"],
  "source": ["memory:main", "tool:web_crawler"],
  "target": "agent:researcher",
  "conversation_id": "conv_01",
  "from_cursor": "stream_01:12",
  "delivery_mode": "at_least_once"
}
```

Subscriptions may filter by:

- Event type pattern
- Source
- Target
- Topic
- Session
- Conversation
- Task
- Time range
- Cursor

## Delivery Semantics

The protocol should define delivery modes but leave implementation to transports.

Valid modes:

- `best_effort`
- `at_least_once`
- `replayable`

AEP should avoid promising strict exactly-once delivery. Instead, every event has a stable ID so consumers can deduplicate.

## Error Model

Errors should be events, not only transport failures.

Standard error payload:

```json
{
  "code": "tool_timeout",
  "message": "Crawler exceeded the configured timeout",
  "retryable": true,
  "details": {}
}
```

## Versioning

AEP should version:

- Protocol envelope
- Event type families
- Payload schemas
- Transport bindings

The envelope should remain stable across minor versions.

## Minimal V0.1 Surface

The first useful version should include:

- Event envelope
- Session initialization
- Capability declaration
- Subscription create/cancel
- Event publish
- Event acknowledgement
- Async tool lifecycle events
- Context and memory event families
- WebSocket and stdio transport bindings
