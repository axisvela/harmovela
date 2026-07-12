# AEP Transport Binding: gRPC

> Status: draft. Part of the AEP 0.1 protocol specification.

## Purpose

Define how AEP runs over gRPC, supporting bidirectional event streams using a single bidirectional RPC with JSON-encoded payloads carried in protobuf messages.

## Service Definition

```
service AepTransport {
  rpc Stream(stream AepMessage) returns (stream AepMessage);
}
```

### Message

```protobuf
message AepMessage {
  string json_payload = 1;
}
```

The `json_payload` field carries a JSON-encoded AEP event envelope. Protobuf is used only for framing; the AEP event schema remains JSON-defined. This avoids duplicating the AEP envelope schema in protobuf and keeps the transport layer independent of protocol evolution.

## Connection

### URI Scheme

```
grpc://host:port/servicePath
```

For TLS-secured connections:

```
grpcs://host:port/servicePath
```

The default service path is `/aep.v1.AepTransport/Stream`.

### Connection Negotiation

The gRPC transport uses standard gRPC channel establishment:

1. Client creates a gRPC channel to the server address.
2. Client invokes the `Stream` bidirectional RPC, receiving a call object.
3. Both peers may immediately begin writing `AepMessage` frames.
4. The stream is long-lived; there is no per-event request/response cycle.

### Metadata

gRPC metadata (headers and trailers) may carry transport-level parameters:

| Metadata Key | Direction | Description |
|---|---|---|
| `aep-session-id` | Client → Server | Session identifier for connection binding |
| `aep-version` | Client → Server | AEP protocol version (e.g., `0.1`) |
| `aep-agent-id` | Client → Server | Optional agent identity |
| `x-aep-cursor` | Server → Client (trailer) | Last committed event cursor on stream close |

Metadata is not part of the AEP event envelope and must not be used to carry event semantics.

## Framing

| Aspect | Specification |
|---|---|
| Frame type | gRPC protobuf messages (binary) |
| Message format | One complete JSON AEP event in `json_payload` per message |
| Encoding | UTF-8 for the JSON payload; standard protobuf framing |
| Flow control | Managed by gRPC/HTTP/2 flow control |
| Message boundaries | Each `AepMessage` is one AEP event |

## Session Lifecycle

| gRPC State | Session State | Notes |
|---|---|---|
| Channel connecting | `CREATED` | |
| Stream open (bidirectional) | `OPENED` | |
| After `session.ready` | `READY` | |
| Stream end (OK status, code 0) | `CLOSED` | Graceful shutdown |
| Stream end (non-zero status) | `ERROR` | See error mapping below |
| Channel disconnected | `ERROR` | Network failure |

## Heartbeat

gRPC provides HTTP/2 PING frames as a transport-level heartbeat. Application-level keep-alive is supported via standard gRPC channel options:

- `grpc.keepalive_time_ms`: Interval between keep-alive pings.
- `grpc.keepalive_timeout_ms`: Time to wait for a keep-alive acknowledgment.
- `grpc.keepalive_permit_without_calls`: Whether keep-alive is allowed when no streams are active.

Application-level `session.heartbeat` events may still be sent over the stream to carry structured metadata, but transport-level keep-alive should be handled by gRPC keep-alive configuration.

A peer that does not receive a PING acknowledgment within `keepalive_timeout_ms` should transition the session to `ERROR`.

## Reconnect and Cursor Recovery

A disconnected client may reconnect and resume the event stream:

1. Client opens a new gRPC channel and invokes `Stream`.
2. Client sends `session.opened` with a new or existing `session_id`.
3. Client sends `subscription.requested` with `from_cursor` set to the last received cursor value.
4. Server replays events from the cursor position.

The cursor value may also be communicated in the server's response trailer under the `x-aep-cursor` metadata key to allow the client to persist the last known position for recovery.

## Status Code Mapping

gRPC status codes are mapped to AEP semantics:

| gRPC Status Code | Code | AEP Mapping |
|---|---|---|
| OK | 0 | `session.closed` with reason `"normal"` |
| CANCELLED | 1 | `session.closed` with reason `"cancelled"` |
| UNAVAILABLE | 14 | `session.error` with code `"transport_unavailable"` |
| PERMISSION_DENIED | 7 | `session.error` with code `"unauthorized"` |
| UNAUTHENTICATED | 16 | `session.error` with code `"unauthenticated"` |
| INTERNAL | 13 | `session.error` with code `"internal_error"` |
| INVALID_ARGUMENT | 3 | `session.error` with code `"invalid_envelope"` |
| RESOURCE_EXHAUSTED | 8 | `session.error` with code `"rate_limited"` |
| DEADLINE_EXCEEDED | 4 | `session.error` with code `"timeout"` |
| ABORTED | 10 | `session.error` with code `"aborted"` |
| UNKNOWN | 2 | `session.error` with code `"unknown"` |

## gRPC-Specific Options

| Option | Default | Description |
|---|---|---|
| `grpc.max_receive_message_length` | 4194304 (4 MB) | Maximum message size in bytes |
| `grpc.max_send_message_length` | 4194304 (4 MB) | Maximum send message size in bytes |
| `grpc.keepalive_time_ms` | 30000 | Keep-alive ping interval |
| `grpc.keepalive_timeout_ms` | 10000 | Keep-alive acknowledgment timeout |

## Implementation Notes

- Implementations should set a reasonable maximum message size. Messages exceeding the limit will trigger a `RESOURCE_EXHAUSTED` gRPC error.
- TLS (`grpcs://`) is strongly recommended for any network-exposed deployment.
- The gRPC transport may coexist with other transports in the same AEP runtime.
- gRPC bidirectional streaming provides native multiplexing without requiring a separate ingest endpoint (unlike SSE).
- Service reflection may be enabled to allow tools like `grpcurl` to inspect the service definition.
- See the [session lifecycle specification](../session.md) for session state machine details.
