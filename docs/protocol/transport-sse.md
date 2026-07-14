# Harmovela Transport Binding: HTTP SSE

> Status: draft. Part of the Harmovela 0.2 transport-sse profile.

## Purpose

Define how Harmovela runs over HTTP Server-Sent Events (SSE), supporting server-to-client event streams with a separate HTTP endpoint for client-to-server messages.

## Model

SSE is a unidirectional transport (server → client). Harmovela over SSE uses two HTTP channels:

| Channel | Method | Direction | Content-Type |
|---|---|---|---|
| Event stream | `GET` | Server → Client | `text/event-stream` |
| Ingest endpoint | `POST` | Client → Server | `application/x-ndjson` |

## Event Stream (GET)

The client opens a long-lived GET request to receive Harmovela events as SSE.

### Request

```
GET /aep/events?session_id=sess_01 HTTP/1.1
Accept: text/event-stream
```

The `session_id` query parameter identifies the session. Multiple clients may share a session via distinct SSE connections.

### Response

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### SSE Event Format

Each Harmovela event is sent as an SSE message:

```
id: evt_01JZ0000000000000000000000
event: task.progress
data: {"aep_version":"0.1","id":"evt_01JZ0000000000000000000000","type":"task.progress",...}

```

Rules:
- `id` — the Harmovela event `id`.
- `event` — the Harmovela event `type`.
- `data` — the full JSON event envelope on a single line.
- Messages are separated by a blank line (`\n\n`).
- The `event` field is optional; if omitted, the SSE event type defaults to `"message"` but the Harmovela `type` is always available in the JSON data.

### Reconnection

The SSE `Last-Event-ID` mechanism supports cursor recovery:

- Server includes `id` with each SSE message.
- On reconnect, the client sends `Last-Event-ID: <last_received_id>` in the GET request header.
- Server replays events after that ID.

### Heartbeat

The server sends SSE comments as keep-alive when no Harmovela events are generated within a negotiated interval:

```
: heartbeat

```

Comment lines start with `:` and are ignored by SSE clients. A client that receives no data (events or comments) for 3 × `heartbeat_interval_ms` should close and reconnect.

## Ingest Endpoint (POST)

The client sends Harmovela events to the server via HTTP POST.

### Request

```
POST /aep/events?session_id=sess_01 HTTP/1.1
Content-Type: application/x-ndjson
```

Body: one or more newline-delimited JSON events.

### Response

```
HTTP/1.1 202 Accepted
Content-Type: application/json

{"accepted": 3, "rejected": 0}
```

The response body summarizes acceptance:

```json
{
  "accepted": 3,
  "rejected": 0,
  "errors": []
}
```

Rejected events (due to validation or other errors) are listed:

```json
{
  "accepted": 1,
  "rejected": 2,
  "errors": [
    {"event_index": 1, "error": {"code": "invalid_envelope", "message": "missing required field: id"}},
    {"event_index": 2, "error": {"code": "invalid_event_type", "message": "unknown event type: custom.foo"}}
  ]
}
```

## Session Lifecycle

| HTTP Interaction | Session State |
|---|---|
| GET event stream established | `OPENED` |
| `session.ready` received via SSE | `READY` |
| GET connection closed (client) | `CLOSED` after grace period |
| POST receives `session.closed` | `CLOSED` |
| Both channels idle > timeout | `ERROR` via `session.timeout` |

A session remains open as long as either the event stream or the ingest endpoint is active. The server may close the session after a configurable idle timeout.

## Error Handling

| Scenario | Response |
|---|---|
| Invalid JSON in POST body | 400 Bad Request |
| Unknown session_id | 404 Not Found |
| POST to closed session | 410 Gone |
| Server internal error | 500 Internal Server Error with error event on SSE |

## Implementation Notes

- SSE is inherently server-to-client only. Bidirectional communication requires the POST endpoint.
- The POST endpoint supports batching (multiple NDJSON events per request) for efficiency.
- CORS headers must be set if the SSE endpoint is accessed from a browser.
- Reconnection via `Last-Event-ID` is transport-level; application-level cursor recovery should use the `from_cursor` field in subscriptions.
- See the [session lifecycle specification](../session.md) for session state machine details.
