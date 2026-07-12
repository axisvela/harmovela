# Harmovela Transport Binding: WebSocket

> Status: draft. Part of the Harmovela 0.2 transport-websocket profile.

## Purpose

Define how AEP runs over WebSocket, supporting bidirectional event streams over TCP with optional TLS.

## Connection

### URI Scheme

```
ws://host:port/path
wss://host:port/path  (TLS)
```

### Subprotocol

The WebSocket handshake must request the subprotocol `aep-0.1`:

```
GET /aep HTTP/1.1
Upgrade: websocket
Sec-WebSocket-Protocol: aep-0.1
```

The server must respond with `Sec-WebSocket-Protocol: aep-0.1` on success.

Future protocol versions use distinct subprotocol strings (e.g., `aep-0.2`). The server may advertise supported versions, and the client selects one.

### Connection Parameters

Path and query string may carry initialization parameters (e.g., `ws://host/aep?session_id=sess_01`). This is transport-level metadata and not part of the protocol envelope.

## Framing

| Aspect | Specification |
|---|---|
| Frame type | Text frames only (opcode `0x1`) |
| Message format | One complete JSON AEP event per message |
| Encoding | UTF-8 |
| Multi-frame | Not used. Each event is a single text frame. |
| Control frames | Ping/Pong used for heartbeat (see below) |

## Session Lifecycle

| WebSocket State | Session State | Notes |
|---|---|---|
| Connecting | `CREATED` | |
| Open (after handshake) | `OPENED` | |
| After `session.ready` | `READY` | |
| Close frame (1000) | `CLOSED` | Graceful shutdown |
| Close frame (1001–1015) | `CLOSED` | Shutdown with reason |
| Connection error | `ERROR` | Network failure |
| Protocol error (1002) | `ERROR` | Framing or message error |

## Heartbeat

WebSocket Ping/Pong frames serve as the transport-level heartbeat:

- Either peer may send WebSocket Ping frames.
- The receiving peer must respond with a Pong frame.
- Ping/Pong interval is negotiated in `session.ready` via `capabilities.heartbeat_interval_ms`.
- A peer that does not receive a Pong within 3 × `heartbeat_interval_ms` should close the connection with code 1001 (going away) and transition the session to `ERROR`.

Application-level `session.heartbeat` events are still sent over text frames and carry structured metadata. Transport-level Ping is a simpler, lower-overhead mechanism for keep-alive.

## Reconnect and Cursor Recovery

A disconnected client may reconnect and resume the event stream from a cursor:

1. Client opens a new WebSocket connection.
2. Client sends `session.opened` with a new or existing `session_id`.
3. Client sends `subscription.requested` with `from_cursor` set to the last received cursor value.
4. Server replays events from the cursor position.

Cursor format is transport-specific. For WebSocket, the cursor is the event `id` plus a sequence number:

```
evt_01JZ0000000000000000000000:42
```

## Close Codes

Standard WebSocket close codes are mapped to AEP semantics:

| Code | Meaning | AEP Mapping |
|---|---|---|
| 1000 | Normal closure | `session.closed` with reason `"normal"` |
| 1001 | Going away | `session.closed` with reason `"peer_disconnected"` |
| 1002 | Protocol error | `session.error` with code `protocol_error` |
| 1008 | Policy violation | `session.error` with code `unauthorized` |
| 1011 | Internal error | `session.error` with code `internal_error` |

## Implementation Notes

- Implementations should set a maximum message size. Messages exceeding the limit should trigger a close (1009 — message too big).
- TLS (`wss://`) is strongly recommended for any network-exposed deployment.
- The WebSocket transport may coexist with other transports in the same AEP runtime.
- See the [session lifecycle specification](../session.md) for session state machine details.
