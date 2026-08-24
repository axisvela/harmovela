# AEP Runtime HTTP API Design (Subproject A)

Date: 2026-07-11
Status: approved for implementation planning

## Goal

Add an HTTP API transport to the AEP runtime so non-WebSocket clients can inspect and ingest events. This subproject A covers read and ingest endpoints only. Subscriptions and push (subproject B) are out of scope here.

## Context

The runtime currently exposes:

- WebSocket transport for bidirectional runtime clients.
- SSE transport for server-to-client streaming.
- A standalone status server providing `GET /healthz`.

There is no HTTP way to ingest a single event or inspect delivery state without a WebSocket client. This subproject introduces a unified `api` HTTP transport.

## Decision

Introduce `transports.api`. The api server absorbs the existing health endpoint. `transports.status` is removed. The `aep status` CLI default URL and default config are updated to point at the api health endpoint.

Rationale:

- One HTTP server is simpler than two.
- Health and inspection are naturally the same surface.
- Keeps runtime transports coherent.

## Scope

### In Scope

- Add `transports.api` to default config, replacing `transports.status`.
- Implement an api HTTP server started by `AepRuntimeService`.
- Endpoints:
  - `GET /healthz` — status, runtime info, delivery stats.
  - `POST /events` — ingest one AEP event through `publish()`.
  - `GET /dlq` — list dead-lettered records.
  - `GET /pending` — list pending delivery records.
  - `GET /stats` — delivery stats.
- Update `aep status` default URL to the api health endpoint.
- Update default config so `aep status` works after `aep init` and `aep start`.
- Tests for each endpoint and for CLI status compatibility.

### Out Of Scope

- No subscriptions endpoints (subproject B).
- No SSE or long-poll push (subproject B).
- No auth.
- No pagination.
- No changes to Python, Go, or Java.
- No protocol-version work.

## Config

`defaultConfig()` transports section:

```json
"api": { "enabled": true, "host": "127.0.0.1", "port": 8790, "path": "/aep/api" }
```

`transports.status` is removed.

Environment overrides (added):

- `AEPD_API_PORT` overrides `transports.api.port`.

Existing overrides `AEPD_HOST`, `AEPD_WS_PORT`, `AEPD_SSE_PORT`, `AEP_POSTGRES_URL` remain.

## Endpoint Design

Base path is `transports.api.path` default `/aep/api`. All endpoints are relative to that base.

### GET {base}/healthz

Response 200 JSON:

```json
{ "status": "ok", "runtime": { "id": "aepd-local", "source": "runtime:aepd" }, "delivery": { "pending": 0, "acknowledged": 0, "deadLettered": 0 } }
```

### POST {base}/events

Request body: one JSON AEP event.

- On valid event: run `publish(event)`, respond 202 with `{ "accepted": true, "id": "<event id>" }`.
- On invalid event: respond 400 with `{ "accepted": false, "errors": ["..."] }`.
- On malformed JSON: respond 400 with `{ "accepted": false, "errors": ["invalid JSON body"] }`.

### GET {base}/dlq

Response 200 JSON:

```json
{ "deadLettered": 1, "records": [ { "eventId": "evt_x", "subscriptionId": "sub_01", "reason": { "error": { "code": "timeout" } } } ] }
```

### GET {base}/pending

Response 200 JSON:

```json
{ "pending": 1, "records": [ { "eventId": "evt_x", "subscriptionId": "_runtime", "sequence": 1 } ] }
```

### GET {base}/stats

Response 200 JSON: the delivery store stats object.

### Unknown routes

Respond 404 with `{ "error": "not found" }`.

## Runtime Integration

`AepRuntimeService.start()`:

- Removes the status branch.
- Adds an api branch that starts the api HTTP server when `transports.api.enabled`.

The api server object exposes `{ port, stop }` and no `send()`, so `publish()` broadcast skips it. The service continues to expose `getStats()`, `getPending()`, and adds `getDeadLettered()` delegation.

Store access:

- The api server reads via `service.getStats()`, `service.getPending()`, and `service.getDeadLettered()`.
- `POST /events` calls `service.publish(event)` and maps validation errors to 400.

Async store note: `POST /events` and read endpoints must await store methods since the PostgreSQL store is async. The api server handlers are async.

## CLI Impact

- `aep status` default URL becomes `http://127.0.0.1:8790/aep/api/healthz`.
- `aep init` default config includes `transports.api`.
- `aep status` behavior otherwise unchanged: prints JSON, non-zero on failure.

## Error Handling

- JSON body parse failure returns 400 with a clear error array.
- Event validation failure returns 400 with the validation error list.
- Store read failures return 500 with `{ "error": "<message>" }`.
- Method not allowed on a known path returns 405 with `{ "error": "method not allowed" }`.

## Testing

Runtime service tests:

- api `GET /healthz` returns ok, runtime id, delivery stats.
- api `POST /events` with a valid event returns 202 and the event is delivered to a router subscriber.
- api `POST /events` with an invalid event returns 400 with errors.
- api `POST /events` with malformed JSON returns 400.
- api `GET /dlq` returns dead-lettered records after a dead-letter.
- api `GET /pending` returns pending records after a publish.
- api `GET /stats` returns stats.
- unknown route returns 404.

CLI tests:

- `aep status` default URL points at api health path and works against a test server.
- `aep init` writes config containing `transports.api`.

Existing runtime and CLI tests updated for the config change from `status` to `api` must remain green.

## Success Criteria

- Non-WebSocket clients can ingest an event via `POST /events`.
- Non-WebSocket clients can inspect health, stats, pending, and dead-letter via HTTP.
- `aep status` works against the api health endpoint.
- TypeScript test suite remains green.
- Subproject B (subscriptions + push) can build on `transports.api` without redesign.
