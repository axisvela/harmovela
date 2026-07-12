# Go Reference Implementation Design

Date: 2026-07-09

## Goal

Add a minimal Go reference implementation under `implementations/go/` that passes AEP-C0 and AEP-C1 conformance against the shared fixture manifest.

This gives the project a third language pillar and validates that the protocol is implementation-neutral.

## Non-Goals

- Do not implement transports (stdio, WebSocket, SSE) in Go yet.
- Do not implement delivery tracking, retry policy, or dead-letter in Go.
- Do not add external Go dependencies for JSON Schema validation. Field-level envelope validation and fixture-driven conformance are sufficient for C0/C1.
- Do not introduce goroutines, channels, or concurrency patterns. The harness is synchronous.
- Do not add a CLI, production server, or example demos yet.

## Approach

Follow the same minimal pattern as the first TypeScript and Python slices: typed envelope, validation function, fixture reader, synchronous harness, and table-driven tests against the shared manifest. Use Go idioms (struct tags, error returns, `testing.T` table tests) but keep scope identical to what TS/Python cover at C1.

## Components

### Module Setup

Create `implementations/go/go.mod` with module path `github.com/axisrobo/aep` and Go 1.21 minimum. No external dependencies for this slice.

### Envelope

`implementations/go/aep/envelope.go`

- `Envelope` struct with JSON tags for all standard envelope fields.
- `ValidateEnvelope(value map[string]any) []string` â€?mirrors TS `validateEnvelope` and Python `validate_envelope`. Returns a slice of error strings; empty slice means valid.
- Checks required fields: `aep_version`, `id`, `type`, `source`, `created_at`, `payload`.
- Validates `aep_version` is `"0.1"`.
- Validates `type` against a known event type registry.
- Validates `created_at` as ISO 8601.
- Validates `delivery.mode` if present.

### Event Type Registry

`implementations/go/aep/event_types.go`

- `IsStandardEventType(typ string) bool` â€?checks a known set of standard draft event types.

### Error Model

`implementations/go/aep/errors.go`

- Standard error code constants.
- `ErrorPayload(code string, message string) map[string]any` â€?produces the standard error payload object.

### Fixture Support

`implementations/go/aep/fixtures.go`

- `LoadManifest(path string) (Manifest, error)` â€?reads and parses `conformance/manifest.json`.
- `LoadFixture(path string) ([]map[string]any, error)` â€?reads NDJSON fixture files.
- `Manifest` struct matching the JSON shape.

### Harness

`implementations/go/aep/harness.go`

- `Harness` struct with maps for subscriptions and tasks, an event router, and a session.
- `Handle(value map[string]any) []map[string]any` â€?validates, dispatches to router, returns response events.
- Handles: `capabilities.requested`, `subscription.requested`, `subscription.cancelled`, `session.opened`, `session.closed`, `task.submitted`, and all other `task.*` events.
- Follows the same state machine as TypeScript `AepHarness` and Python `AepHarness`.

### Router

`implementations/go/aep/router.go`

- `EventRouter` with handler registration by type pattern and a catch-all.
- `Dispatch(event map[string]any) []map[string]any` â€?matches handlers and collects responses.

### Tests

`implementations/go/aep/envelope_test.go` â€?unit tests for envelope validation.
`implementations/go/aep/harness_test.go` â€?unit tests for harness behavior (capabilities, subscriptions, sessions, tasks).
`implementations/go/aep/router_test.go` â€?unit tests for event routing.
`implementations/go/aep/conformance_test.go` â€?manifest-driven test that:

- Reads `../../conformance/manifest.json`.
- Filters fixtures to target level AEP-C1.
- For each fixture: loads NDJSON, validates envelopes, checks expected types.
- For `stateful_flow` fixtures: runs events through `Harness.Handle()` and asserts no `event.rejected`.

## Data Flow

1. Test reads manifest, selects AEP-C1 fixtures.
2. For each fixture, NDJSON lines are parsed as `map[string]any`.
3. Each event is validated via `ValidateEnvelope`.
4. For stateful fixtures, events are fed through `Harness.Handle()`.
5. Responses are checked for `event.rejected`.
6. Any failure reports fixture path, event index, and error detail.

## Error Handling

- Validation returns error strings, not sentinel values.
- Harness returns `event.rejected` with standard error payloads.
- Fixture loading returns Go errors for missing files or invalid JSON.
- Conformance test uses `testing.T.Error` for fixture failures with descriptive messages.

## Testing

Verification:

```sh
cd implementations/go && go test ./...
cd implementations/typescript && npm test
cd implementations/typescript && npm run conformance
cd implementations/python && python -m pytest --tb=short -q
```

## Documentation Updates

Update:

- `implementations/go/README.md` â€?replace placeholder text with setup commands, test commands, and current scope.
- `README.md` â€?update Go status from "planned" to "draft reference with C1 conformance".
- `docs/roadmap.md` â€?note Go reference progress if there is a relevant phase item.

## Open Decisions Resolved

- Go module path: `github.com/axisrobo/aep`.
- No external dependencies for this slice.
- Synchronous-only harness, no goroutines or channels.
- No JSON Schema validation; field-level validation is sufficient for C1.
- Table-driven tests follow Go `testing.T` patterns.
- Conformance tests consume the same shared manifest as TypeScript and Python.
