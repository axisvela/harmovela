# AEP Task Lifecycle

> Status: draft. Part of the AEP 0.1 protocol specification.

## Purpose

Define the lifecycle of long-running asynchronous tasks. A task is a unit of work that may span multiple events and take an arbitrary amount of time to complete.

## Task States

```
                ┌─────────┐
                │SUBMITTED│
                └────┬────┘
                     │
                ┌────▼────┐
                │ACCEPTED ├────────────────────────┐
                └────┬────┘                        │
                     │                              │
                ┌────▼────┐                         │
           ┌────┤ STARTED ├────┐                    │
           │    └────┬────┘    │                    │
           │         │         │                    │
      ┌────▼───┐ ┌───▼────┐ ┌─▼──────┐             │
      │BLOCKED │ │PROGRESS│ │ OUTPUT │             │
      └────┬───┘ └───┬────┘ └─┬──────┘             │
           │         │         │                    │
           └─────────┴─────────┘                    │
                     │           ┌──────────┬───────┘
          ┌──────────┼───────────┤          │
          │          │           │          │
     ┌────▼──┐ ┌─────▼────┐ ┌───▼───┐ ┌───▼───────┐
     │FAILED │ │COMPLETED │ │CANCELLED│ │ TIMED_OUT │
     └───────┘ └──────────┘ └────────┘ └───────────┘
```

### State Transitions

| From | To | Event | Notes |
|---|---|---|---|
| — | `SUBMITTED` | `task.submitted` | Initial state |
| `SUBMITTED` | `ACCEPTED` | `task.accepted` | Producer accepts the task |
| `SUBMITTED` | `FAILED` | `task.failed` | Pre-validation failure |
| `SUBMITTED` | `CANCELLED` | `task.cancelled` | Cancelled before acceptance |
| `SUBMITTED` | `TIMED_OUT` | `task.timed_out` | Expired before acceptance |
| `ACCEPTED` | `STARTED` | `task.started` | Work begins |
| `ACCEPTED` | `FAILED` | `task.failed` | Failed before starting |
| `ACCEPTED` | `CANCELLED` | `task.cancelled` | Cancelled before starting |
| `ACCEPTED` | `TIMED_OUT` | `task.timed_out` | Expired before starting |
| `STARTED` | `PROGRESS` | `task.progress` | Intermediate progress report |
| `STARTED` | `OUTPUT` | `task.output` | Partial output produced |
| `STARTED` | `BLOCKED` | `task.blocked` | Waiting for dependency |
| `STARTED` | `COMPLETED` | `task.completed` | Task finished successfully |
| `STARTED` | `FAILED` | `task.failed` | Task failed during execution |
| `STARTED` | `CANCELLED` | `task.cancelled` | Cancelled during execution |
| `STARTED` | `TIMED_OUT` | `task.timed_out` | Exceeded deadline |
| `BLOCKED` | `STARTED` | `task.started` | Resumed after unblocking |
| `BLOCKED` | `PROGRESS` | `task.progress` | Progress while blocked |
| `BLOCKED` | `FAILED` | `task.failed` | Failed while blocked |
| `BLOCKED` | `CANCELLED` | `task.cancelled` | Cancelled while blocked |
| `BLOCKED` | `TIMED_OUT` | `task.timed_out` | Expired while blocked |
| `PROGRESS` | `PROGRESS` | `task.progress` | Repeated progress updates |
| `PROGRESS` | `OUTPUT` | `task.output` | Partial output |
| `PROGRESS` | `BLOCKED` | `task.blocked` | Blocked during progress |
| `PROGRESS` | `COMPLETED` | `task.completed` | Task finished |
| `PROGRESS` | `FAILED` | `task.failed` | Failed during progress |
| `PROGRESS` | `CANCELLED` | `task.cancelled` | Cancelled during progress |
| `PROGRESS` | `TIMED_OUT` | `task.timed_out` | Expired during progress |
| `OUTPUT` | `PROGRESS` | `task.progress` | More progress after partial output |
| `OUTPUT` | `OUTPUT` | `task.output` | Additional partial output |
| `OUTPUT` | `BLOCKED` | `task.blocked` | Blocked after partial output |
| `OUTPUT` | `COMPLETED` | `task.completed` | Final output = completion |
| `OUTPUT` | `FAILED` | `task.failed` | Failed after partial output |
| `OUTPUT` | `CANCELLED` | `task.cancelled` | Cancelled after partial output |
| `OUTPUT` | `TIMED_OUT` | `task.timed_out` | Expired after partial output |

Terminal states: `COMPLETED`, `FAILED`, `CANCELLED`, `TIMED_OUT`.

## Task Events

All task events share a common envelope pattern:

```json
{
  "type": "task.<action>",
  "task_id": "task_01",
  "payload": {
    "task_id": "task_01",
    "state": "<current_state>"
  }
}
```

### `task.submitted`

Initiates a task. Sent by the consumer or orchestrator.

```json
{
  "type": "task.submitted",
  "task_id": "task_01",
  "payload": {
    "task_id": "task_01",
    "description": "crawl example.org",
    "timeout_ms": 300000,
    "priority": "normal"
  }
}
```

Optional payload fields: `description`, `timeout_ms`, `priority`.

### `task.accepted`

Producer confirms it will execute the task.

### `task.started`

Producer has begun execution.

### `task.progress`

Intermediate progress update.

```json
{
  "type": "task.progress",
  "task_id": "task_01",
  "payload": {
    "task_id": "task_01",
    "state": "progress",
    "message": "Indexed 120 of 500 pages",
    "progress": 0.24
  }
}
```

Optional payload fields: `message` (string), `progress` (number 0..1).

### `task.output`

Partial or streaming output from an in-progress task.

### `task.blocked`

Task cannot proceed until a dependency is resolved.

```json
{
  "type": "task.blocked",
  "task_id": "task_01",
  "payload": {
    "task_id": "task_01",
    "state": "blocked",
    "reason": "waiting for memory indexing"
  }
}
```

### `task.completed`

Task finished successfully.

```json
{
  "type": "task.completed",
  "task_id": "task_01",
  "payload": {
    "task_id": "task_01",
    "state": "completed",
    "result": { "pages_indexed": 500 }
  }
}
```

The `result` field carries the task's final output.

### `task.failed`

Task execution failed.

```json
{
  "type": "task.failed",
  "task_id": "task_01",
  "payload": {
    "task_id": "task_01",
    "state": "failed",
    "error": {
      "code": "tool_error",
      "message": "crawler returned HTTP 503",
      "retryable": true
    }
  }
}
```

### `task.cancelled`

Task was cancelled, either by the consumer or the producer.

```json
{
  "type": "task.cancelled",
  "task_id": "task_01",
  "payload": {
    "task_id": "task_01",
    "state": "cancelled",
    "reason": "user requested cancellation"
  }
}
```

### `task.timed_out`

Task exceeded its configured timeout.

```json
{
  "type": "task.timed_out",
  "task_id": "task_01",
  "payload": {
    "task_id": "task_01",
    "state": "timed_out",
    "error": {
      "code": "task_timeout",
      "message": "task task_01 timed out",
      "retryable": true
    }
  }
}
```

## Cancellation Protocol

Cancellation is a two-phase process:

1. **Request**: Consumer sends `task.cancel.requested` (note: distinct event type from `task.cancelled`).
2. **Confirm**: Producer sends `task.cancelled` after stopping work and cleaning up.

The task may still produce events between the request and confirmation. Consumers must handle this.

## Timeout Semantics

A `timeout_ms` value in `task.submitted` sets a deadline. The producer is responsible for sending `task.timed_out` if the task does not reach a terminal state within the deadline.

A producer may also apply a default timeout for tasks without an explicit `timeout_ms`.

## Implementation Notes

- Task state transitions must be enforced. Attempting an illegal transition should result in an `event.rejected` or `task.failed` response.
- Terminal states are final. No further task events should be accepted or produced after a terminal state.
- The `task_id` must be present in the envelope top-level `task_id` field and in `payload.task_id` for consistency.
- Producers should assign `task_id` if the consumer does not provide one, and return it in `task.accepted`.
