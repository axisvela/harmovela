# Harmovela Task Lifecycle

> Status: draft. Part of the Harmovela 0.2 core specification.
> Category: core

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

## Parent-Child Task Relationships

Tasks may be organized in parent-child hierarchies via the `parent_task_id` envelope field. A parent task delegates work to child tasks or spawns subtasks that must be resolved before the parent itself can complete.

### Terminal State Ordering

- A child task MAY reach a terminal state independently of, and before, its parent. The common orchestration pattern — child completes first, parent aggregates — is valid and expected.
- A parent task MUST NOT transition to a terminal state while it has active (non-terminal) child tasks. The runtime or orchestrator MUST ensure all children reach a terminal state (naturally or via cancellation) before allowing the parent to complete, fail, cancel, or time out.
- When a parent task is cancelled, all child tasks MUST be cancelled. The runtime or orchestrator SHOULD emit `task.cancelled` for each child, referencing the parent via `causation_id`.
- When a parent task fails, child tasks SHOULD be cancelled unless the child tasks are independent and the runtime policy permits orphaned continuation.

### Conformance Fixtures

Parent-child terminal ordering is validated by:
- `conformance/fixtures/parent-child-positive.ndjson`: child completes before parent (valid).
- `conformance/fixtures/parent-child-negative.ndjson`: parent completes while child is active (invalid).

## Implementation Notes

- Task state transitions must be enforced. Attempting an illegal transition MUST result in an `event.rejected` or `task.failed` response.
- Terminal states are final. No further task events MUST be accepted or produced after a terminal state.
- Implementations MUST validate parent-child terminal ordering before allowing a parent to reach a terminal state.
- The `task_id` MUST be present in the envelope top-level `task_id` field and in `payload.task_id` for consistency.
- Producers SHOULD assign `task_id` if the consumer does not provide one, and return it in `task.accepted`.
