# AEP Versioning

> Status: draft. Part of the AEP 0.1 protocol specification.

## Purpose

Define how AEP versions protocol assets and how implementations negotiate compatibility.

## Versioned Assets

AEP versions four distinct assets independently:

| Asset | Version Field | Example | Scope |
|---|---|---|---|
| Protocol envelope | `aep_version` | `"0.1"` | Envelope field set, required fields, semantic rules |
| Event type families | Event type registry | — | Standard event type names and semantics |
| Payload schemas | `payload_schema` (URI) | `https://schemas.axisrobo.com/tool.call.progress.v1.json` | Per-event payload structure |
| Transport bindings | Transport spec | — | stdio framing, WebSocket subprotocol, etc. |

## Protocol Envelope Versioning

### Format

The `aep_version` field uses `MAJOR.MINOR` format (e.g., `"0.1"`).

### Compatibility Rules

Within a minor version:
- Existing required envelope fields must not be removed.
- Existing field semantics must not change.
- New optional fields may be added.
- Existing optional fields may become required in the next minor version.

Across major versions:
- Required fields may change.
- Envelope structure may differ.
- Implementations must reject envelopes with an unsupported major version with `unsupported_version`.

### Negotiation

During session initialization (`session.opened` / `session.ready`), peers declare their supported protocol version via `capabilities.aep_version`. Both sides must agree on a version before the session becomes ready. A peer that cannot negotiate a compatible version should send `session.error` with code `unsupported_version`.

## Event Type Registry Versioning

The standard event type registry (the set of `type` string values defined in `docs/specs/`) follows these rules:

- New event types may be added in any minor version.
- Existing event type names must not be removed within a minor version.
- Existing event type semantics must not change in incompatible ways within a minor version.
- Implementations should treat unknown event types as opaque (validate envelope, forward if applicable) rather than reject them.

## Payload Schema Versioning

Each event type family may define one or more payload schemas. A payload schema is identified by a URI in the `payload_schema` field:

```json
{
  "type": "memory.fact.added",
  "payload_schema": "https://schemas.axisrobo.com/memory.fact.added.v1.json",
  "payload": { ... }
}
```

Rules:
- Payload schemas version independently of the protocol envelope.
- A payload schema URI should embed the schema version (e.g., `...v1`, `...v2`).
- Changing a payload schema in a backward-incompatible way requires a new URI.
- Implementations may validate payloads against schemas when `payload_schema` is present.

## Transport Binding Versioning

Each transport binding (stdio, WebSocket, HTTP SSE, etc.) versions independently of the protocol envelope. A transport binding specification defines:

- Framing rules (e.g., newline-delimited JSON for stdio)
- Connection lifecycle
- Error handling for transport-level failures
- Subprotocol identifiers (e.g., WebSocket subprotocol names)

Current transport binding documents: none finalized. See `docs/specs/transport-stdio.md` and `docs/specs/transport-websocket.md` (planned).

## Forward Compatibility

Implementations should follow these forward-compatibility practices:

1. **Ignore unknown fields** in envelopes and payloads.
2. **Treat unknown event types** as valid but unhandled (acknowledge if required, do not reject).
3. **Downgrade gracefully** when a peer declares an older version — use only features available in that version.
4. **Log, don't crash** on protocol features you don't recognize.

## Deprecation Policy

AEP follows a no-surprise deprecation policy:

1. **Deprecation notice**: A field, event type, or feature is marked deprecated in a minor version release.
2. **Support window**: The deprecated item is supported for at least one additional minor version.
3. **Removal**: The item is removed in the next major version.

Deprecation notices appear in the protocol specification changelog and the relevant spec document.

## Implementation Notes

- Implementations must include `aep_version` in every envelope.
- Version mismatch should result in `event.rejected` with code `unsupported_version` and `details.supported` listing accepted versions.
- Payload schema URIs are not validated by the protocol layer itself; they are metadata for schema-aware consumers.
