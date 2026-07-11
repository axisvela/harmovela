# Multi-Language HTTP Subscriptions Parity Design: Python, Go, Java

Date: 2026-07-11
Status: approved for implementation planning

## Goal

Bring Python, Go, and Java runtimes to parity with the TypeScript HTTP subscriptions feature (subproject B): subscription persistence in every delivery store, a runtime subscription registry with buffered fanout, HTTP subscription CRUD endpoints, long-poll, and SSE streaming. All three languages advance in the same round, each as its own implementation plan.

## Baseline

TypeScript already implements this. The reference behavior lives in:

- `reference/typescript/src/delivery-store-*.js` (subscription CRUD)
- `reference/typescript/src/runtime/service.js` (registry, buffer, fanout, `takeEvents`, `attachStream`)
- `reference/typescript/src/runtime/api-server.js` (subscription routes, long-poll, SSE)

Python, Go, and Java already have the core runtime (config, service, `aepd`, CLI, HTTP read+ingest API) and a `matchesType` / `subscription_matches` helper.

## Scope

### In Scope (per language)

1. Subscription CRUD in all three delivery stores: in-memory, SQLite, PostgreSQL.
   - `createSubscription(record)`, `getSubscription(id)`, `listSubscriptions()`, `deleteSubscription(id)`.
   - Persist only the subscription definition (`id`, `filter`, `created_at`).
2. Runtime subscription registry in the runtime service:
   - Load persisted subscriptions on start.
   - On publish, fan out matching events into a per-subscription in-memory buffer (bounded at 1000, drop oldest).
   - `createSubscription(filter)`, `listSubscriptions()`, `getSubscription(id)`, `deleteSubscription(id)`, `takeEvents(id, max)`, `attachStream(id, sink)`.
3. HTTP subscription endpoints on the existing api server:
   - `POST {base}/subscriptions` — create, 201 with record.
   - `GET {base}/subscriptions` — list, `{ "subscriptions": [...] }`.
   - `GET {base}/subscriptions/:id` — get, 404 if unknown.
   - `DELETE {base}/subscriptions/:id` — delete, `{ "deleted": true }`, 404 if unknown.
   - `GET {base}/subscriptions/:id/events` — long-poll, `{ "events": [...] }`, 404 if unknown.
   - `GET {base}/subscriptions/:id/stream` — SSE stream of matching events, 404 if unknown.

### Out Of Scope

- No delivery acknowledgement over HTTP.
- No cross-process fanout; buffers are per runtime process.
- No changes to TypeScript.
- No MCP bridge.
- No protocol changes.

## Shared Conventions

### Subscription Record

```json
{
  "id": "sub_<token>",
  "filter": { "types": "task.*", "source": "agent:researcher" },
  "created_at": "2026-07-11T10:00:00Z"
}
```

`filter` fields are optional and follow the existing subscription filter shape. Matching uses the existing `subscription_matches` / `subscriptionMatches` semantics: match the event against `{ payload: filter }`. Where a language only exposes `matchesType`, the registry applies `matchesType(filter.types, event.type)` plus equality checks for `source`, `target`, `topic`, `session_id`, `conversation_id`, `task_id`; extract a shared `subscriptionMatches` helper if not present.

### Store Table Schema

SQLite:

```sql
CREATE TABLE IF NOT EXISTS delivery_subscriptions (
  id TEXT PRIMARY KEY,
  filter TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS <prefix>_subscriptions (
  id TEXT PRIMARY KEY,
  filter JSONB NOT NULL,
  created_at TEXT NOT NULL
);
```

In-memory: a map from id to record.

### Endpoint Behavior

- Base path from `transports.api.path`, default `/aep/api`.
- Create accepts `{ "filter": {...} }` or a bare filter object.
- Malformed JSON on create returns 400 `{ "error": "invalid JSON body" }`.
- Unknown id returns 404 `{ "error": "not found" }` on get/delete/events/stream.
- Long-poll drains up to a default batch (100) immediately and returns available events.
- SSE sets `Content-Type: text/event-stream`, flushes an initial comment to establish the stream, sends buffered events, then streams new matching events; closes cleanly on disconnect.

### Registry Semantics

- The registry buffer holds events matched at publish time.
- `takeEvents` drains and removes events (used by long-poll and by SSE initial flush).
- `attachStream` registers a sink invoked on each new matching event; returns a detach handle.
- Buffer bound: 1000 events; when exceeded, drop oldest.

## Per-Language Notes

### Python (`reference/python`)

- Stores: add methods to `delivery_store.py`, `sqlite_delivery_store.py`, `postgres_delivery_store.py`.
- Registry: extend `aep/runtime/service.py`.
- Endpoints: extend `aep/runtime/api_server.py` (stdlib `http.server`). SSE uses a long-lived `do_GET` writing to `wfile`; the threading server already handles concurrent requests.
- SSE disconnect detection: writes raise on a closed socket; catch and detach.

### Go (`reference/go`)

- Stores: add to `delivery_store.go` (+ interface), `delivery_sqlite.go`, `delivery_postgres.go`.
- Registry: extend `RuntimeService` in `runtime.go`.
- Endpoints: extend the api mux handler. SSE uses `http.Flusher`; long-poll returns immediately.
- Concurrency: guard the registry with a mutex; the broadcast server and api server run in separate goroutines.

### Java (`reference/java`)

- Stores: add to `DeliveryStore` interface, `InMemoryDeliveryStore`, `SqliteDeliveryStore`, `PostgresDeliveryStore`.
- Registry: extend `AepRuntimeService`.
- Endpoints: extend `ApiServer` (`com.sun.net.httpserver`). SSE writes to the exchange response body and flushes; long-poll returns immediately.
- Concurrency: guard the registry with synchronization; the JDK http server uses a thread per request by default when an executor is set, or the default executor otherwise.

## Testing Strategy

Each language keeps its existing suite green and adds:

- Store subscription CRUD tests for in-memory, SQLite, PostgreSQL.
- Runtime registry test: create subscription, publish matching + non-matching events, drain buffer.
- HTTP endpoint tests: create/list/get/delete, long-poll returns a published matching event, unknown id returns 404.
- SSE test: subscribe over the stream endpoint, publish a matching event, assert it arrives; ensure clean shutdown (mirror the TypeScript SSE header-flush fix so the client response resolves).

PostgreSQL store subscription tests follow each language's existing live-DB convention.

## Success Criteria

- Python, Go, and Java each expose HTTP subscription CRUD, long-poll, and SSE.
- Subscription definitions persist across restart in all three stores per language.
- Non-WebSocket clients get a complete subscribe-and-receive path in every language.
- All four language suites remain green.
