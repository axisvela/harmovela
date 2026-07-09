# AEP Session Lifecycle

> Status: draft. Part of the AEP 0.1 protocol specification.

## Purpose

Define the session lifecycle that governs protocol-level communication between an AEP producer and consumer. A session represents an established bidirectional event stream.

## State Machine

A session moves through the following states:

```
 CREATED
    │
    ▼
 OPENED ──────────────────────────────────┐
    │                                      │
    ▼                                      │
  READY ──────────(heartbeat loop)────────┐│
    │           │                          ││
    │           └──────────────────────┐   ││
    ▼                                  ▼   ▼▼
 CLOSED                              ERROR
```

Valid transitions:

| From | To | Trigger |
|---|---|---|
| `CREATED` | `OPENED` | `session.opened` event sent or received |
| `CREATED` | `CLOSED` | Transport disconnect before open |
| `CREATED` | `ERROR` | Protocol or transport error before open |
| `OPENED` | `READY` | `session.ready` sent, capability negotiation complete |
| `OPENED` | `CLOSED` | `session.closed` or transport disconnect |
| `OPENED` | `ERROR` | Protocol or transport error |
| `READY` | `CLOSED` | `session.closed` or graceful transport shutdown |
| `READY` | `ERROR` | Unrecoverable error or heartbeat timeout |
| `CLOSED` | — | Terminal state |
| `ERROR` | — | Terminal state |

## Session Events

### `session.opened`

Sent by the initiator to begin a session.

```json
{
  "type": "session.opened",
  "payload": {
    "session_id": "sess_01",
    "version": "0.1"
  }
}
```

Required payload fields: `session_id`, `version`.

### `session.ready`

Sent when the handshake completes and both sides agree on capabilities. A session is not usable until `session.ready` has been exchanged.

```json
{
  "type": "session.ready",
  "payload": {
    "session_id": "sess_01",
    "capabilities": {
      "protocol": "aep",
      "aep_version": "0.1",
      "transports": ["stdio", "websocket"],
      "delivery_modes": ["best_effort", "at_least_once", "replayable"],
      "features": ["envelope", "subscription", "task_lifecycle", "error_model"],
      "max_payload_size": 1048576,
      "compression": ["gzip"],
      "heartbeat_interval_ms": 30000
    }
  }
}
```

Required payload fields: `session_id`, `capabilities`.

Capability fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `protocol` | string | yes | `"aep"` |
| `aep_version` | string | yes | Protocol version string |
| `transports` | string[] | yes | Supported transport names |
| `delivery_modes` | string[] | no | Supported delivery guarantees |
| `features` | string[] | no | Supported protocol features |
| `max_payload_size` | number | no | Maximum payload bytes accepted |
| `compression` | string[] | no | Supported compression algorithms |
| `heartbeat_interval_ms` | number | no | Expected heartbeat interval (0 = disabled) |

### `session.heartbeat`

Sent periodically by either side when `heartbeat_interval_ms` > 0. No response is expected. A peer that misses N consecutive heartbeat intervals (implementation-defined, recommended N=3) should transition the session to `ERROR`.

```json
{
  "type": "session.heartbeat",
  "payload": {
    "session_id": "sess_01"
  }
}
```

### `session.closed`

Graceful shutdown. After sending or receiving `session.closed`, the session is in terminal state and no further events should be exchanged.

```json
{
  "type": "session.closed",
  "payload": {
    "session_id": "sess_01",
    "reason": "done"
  }
}
```

### `session.error`

Unrecoverable session error. The session transitions to `ERROR` on send or receive. The transport should close after delivering this event.

```json
{
  "type": "session.error",
  "payload": {
    "session_id": "sess_01",
    "error": {
      "code": "session_timeout",
      "message": "heartbeat timeout after 3 missed intervals",
      "retryable": true,
      "details": {
        "last_heartbeat_at": "2026-07-09T10:05:00Z"
      }
    }
  }
}
```

Error payload structure follows the [error model](./error-model.md).

## Implementation Notes

- Implementations must track session state and reject events from sessions in terminal or unknown states.
- A session is identified by `session_id`. An implementation may support multiple concurrent sessions identified by distinct IDs.
- Heartbeat is disabled by default (`heartbeat_interval_ms` = 0 or absent). Enabling it is an explicit capability negotiation decision.
- See the [versioning specification](./versioning.md) for protocol version negotiation rules.
