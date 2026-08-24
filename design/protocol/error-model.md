# Harmovela Error Model

> Status: draft. Part of the Harmovela 0.2 core specification.
> Category: core

## Purpose

Define the standard error structure, error code taxonomy, and retryability rules used across all Harmovela events.

## Standard Error Payload

Every Harmovela error uses the same structure:

```json
{
  "code": "task_timeout",
  "message": "task task_01 exceeded the 300s deadline",
  "retryable": true,
  "details": {
    "task_id": "task_01",
    "timeout_ms": 300000,
    "elapsed_ms": 302150
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | yes | Machine-readable error code |
| `message` | string | yes | Human-readable description |
| `retryable` | boolean | yes | Whether the caller may retry after this error |
| `details` | object | no | Context-specific error metadata |

## Error Code Taxonomy

Errors are organized by domain. Each domain has a prefix that maps to the protocol layer where the error originates.

### Protocol Errors (`protocol_*`)

Errors that prevent normal message processing.

| Code | Retryable | Meaning |
|---|---|---|
| `protocol_error` | no | Unspecified protocol violation |
| `invalid_envelope` | no | Envelope missing required fields or malformed |
| `invalid_event_type` | no | Event type not in registry or invalid format |
| `unsupported_version` | no | Protocol version not supported by this peer |
| `internal_error` | yes | Unexpected internal processing failure |

### Session Errors (`session_*`)

Errors that affect the transport-level session.

| Code | Retryable | Meaning |
|---|---|---|
| `session_error` | no | Unspecified session error |
| `session_timeout` | yes | Session timed out (heartbeat or idle) |
| `session_closed` | no | Session was closed unexpectedly |
| `unauthorized` | no | Authentication or authorization failed |

### Subscription Errors (`subscription_*`)

Errors related to subscription creation or management.

| Code | Retryable | Meaning |
|---|---|---|
| `subscription_error` | no | Unspecified subscription error |
| `subscription_rejected` | no | Subscription request rejected by producer |

### Task Errors (`task_*`)

Errors during task lifecycle.

| Code | Retryable | Meaning |
|---|---|---|
| `task_error` | no | Unspecified task error |
| `task_timeout` | yes | Task exceeded its deadline |
| `task_cancelled` | no | Task was cancelled |

### Tool Errors (`tool_*`)

Errors from tool execution.

| Code | Retryable | Meaning |
|---|---|---|
| `tool_error` | no | Unspecified tool execution error |
| `tool_timeout` | yes | Tool execution exceeded deadline |

## Retryability Rules

An error is retryable if the same operation might succeed on a subsequent attempt without external state changes. The rule of thumb:

- **Retryable**: timeout-based errors, transient infrastructure failures (`internal_error`)
- **Not retryable**: validation errors, authorization failures, protocol violations, explicit cancellations

Consumers may retry retryable errors. Producers should not retry non-retryable errors.

## Error Propagation

Errors appear in event payloads according to the event type:

| Event | Error Location |
|---|---|
| `event.rejected` | `payload.error` |
| `session.error` | `payload.error` |
| `task.failed` | `payload.error` |
| `tool.call.failed` | `payload.error` |
| `subscription.rejected` | `payload.error` |
| `event.dead_lettered` | `payload.error` |

## Implementation Notes

- Implementations must validate that error payloads include `code`, `message`, and `retryable`.
- The `details` field is free-form but should be a JSON object with string keys.
- New error codes may be added in minor protocol versions. Implementations should treat unknown error codes as `protocol_error` rather than rejecting the envelope.
- Error codes are case-sensitive lowercase strings with underscores.
