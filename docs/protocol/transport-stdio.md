# Harmovela Transport Binding: stdio

> Status: draft. Part of the Harmovela 0.2 transport-stdio profile.

## Purpose

Define how Harmovela runs over standard input / standard output, supporting local process integration with no network dependency.

## Framing

Harmovela over stdio uses **newline-delimited JSON (NDJSON)**:

- Each line is a complete, valid JSON-encoded Harmovela event.
- Lines are separated by `\n` (LF).
- Empty lines are ignored.
- Neither side should emit partial or multi-line JSON.

Example stream:

```
{"aep_version":"0.1","id":"evt_01","type":"session.opened",...}
{"aep_version":"0.1","id":"evt_02","type":"session.ready",...}
{"aep_version":"0.1","id":"evt_03","type":"session.closed",...}
```

## Direction

| Stream | Direction | Purpose |
|---|---|---|
| `stdin` | Transport → Process | Inbound events (consumer receives) |
| `stdout` | Process → Transport | Outbound events (producer sends) |
| `stderr` | Process → Transport | Diagnostic output and error events |

`stderr` may carry:
- Non-JSON diagnostic messages
- `event.rejected` or `session.error` events that could not be sent on `stdout`

## Session Lifecycle

The process lifecycle maps directly to session lifecycle:

| Process State | Session State | Notes |
|---|---|---|
| Start | `CREATED` | |
| First `session.opened` on stdin | `OPENED` | |
| `session.ready` sent on stdout | `READY` | |
| Process exit (0) | `CLOSED` | Graceful shutdown |
| Process exit (non-0) | `ERROR` | Unexpected termination |
| stdin closed | `CLOSED` | Remote peer disconnected |
| Broken pipe on stdout | `CLOSED` | Remote peer disconnected |

## Error Handling

- Malformed JSON (parse error): respond with `event.rejected` on stderr.
- Write failure (broken pipe): treat as session close, exit cleanly.
- Stdin closed unexpectedly: send `session.closed` on stdout if still open, then exit.

## Implementation Notes

- The transport binding is OS-independent. On Windows, the process must handle `\r\n` gracefully (the reader should accept `\r\n` as a line terminator).
- Payload size is limited by available memory. Implementations may set a `max_payload_size` in capability negotiation.
- See the [session lifecycle specification](../session.md) for session state machine details.
