# AEP Runtime HTTP Subscriptions And Push Design (Subproject B)

Date: 2026-07-11
Status: approved for implementation planning

## Goal

Add HTTP subscription management and event push to the AEP runtime api transport. Clients can create, list, and delete subscriptions, then receive matching events over SSE or long-poll. Subscription definitions persist in the delivery store backend across all three TypeScript stores.

## Context

Subproject A added the `api` HTTP transport with health, event ingest, dlq, pending, and stats. This subproject B builds on `transports.api`. It reuses:

- `subscriptionMatches(subscription, event)` from `src/subscription.js`.
- The runtime router and `publish()` flow.
- The three delivery stores: in-memory, SQLite, PostgreSQL.

## Scope

### In Scope

- Subscription persistence CRUD in all three TypeScript stores: in-memory, SQLite, PostgreSQL.
- Runtime subscription registry that loads persisted subscriptions and buffers matching events in memory per subscription.
- api endpoints:
  - `POST {base}/subscriptions` — create a subscription with a filter.
  - `GET {base}/subscriptions` — list subscriptions.
  - `GET {base}/subscriptions/:id` — get one subscription.
  - `DELETE {base}/subscriptions/:id` — delete a subscription.
  - `GET {base}/subscriptions/:id/events` — long-poll next batch.
  - `GET {base}/subscriptions/:id/stream` — SSE push of matching events.
- Filter reuse: `{ types, source, target, topic, session_id, conversation_id, task_id }`.
- Tests for store CRUD (three stores) and api subscription endpoints (memory and SQLite; PostgreSQL behind live DB).

### Out Of Scope

- No auth.
- No delivery acknowledgement over HTTP.
- No cross-process fanout; buffering is per runtime process.
- No replay from delivery journal over HTTP.
- No changes to Python, Go, or Java.
- No protocol-version work.

## Subscription Model

A subscription record:

```json
{
  "id": "sub_<token>",
  "filter": {
    "types": "task.*",
    "source": "agent:researcher"
  },
  "created_at": "2026-07-11T10:00:00Z"
}
```

`filter` fields are optional and follow the existing subscription filter shape. Matching uses `subscriptionMatches({ payload: filter }, event)`.

Only the subscription definition persists. The per-subscription event buffer is in memory and does not survive restart. On restart, persisted subscriptions reload with empty buffers.

## Store CRUD API

Each store adds subscription methods. Sync stores (memory, SQLite) return values directly. The async store (PostgreSQL) returns promises. The runtime awaits all subscription calls so both shapes work.

Methods:

```
createSubscription(record)          -> record
getSubscription(id)                 -> record | null
listSubscriptions()                 -> [record]
deleteSubscription(id)              -> boolean
```

### In-Memory Store

A `Map` from id to record.

### SQLite Store

A `delivery_subscriptions` table:

```sql
CREATE TABLE IF NOT EXISTS delivery_subscriptions (
  id TEXT PRIMARY KEY,
  filter TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

`filter` stored as JSON text.

### PostgreSQL Store

A `<prefix>_subscriptions` table:

```sql
CREATE TABLE IF NOT EXISTS <prefix>_subscriptions (
  id TEXT PRIMARY KEY,
  filter JSONB NOT NULL,
  created_at TEXT NOT NULL
);
```

Created in the existing `init()` schema block.

## Runtime Subscription Registry

`AepRuntimeService` gains a subscription registry:

- On `start()`, load persisted subscriptions from the store and create an in-memory buffer for each.
- On `publish(event)`, after routing, for each subscription whose filter matches, append the event to that subscription buffer and notify any attached SSE clients.
- Buffers are bounded. Default maximum 1000 events per subscription; when exceeded, drop oldest.

Registry methods on the service:

```
createSubscription(filter)          -> record   (persists + buffers)
listSubscriptions()                 -> [record]
getSubscription(id)                 -> record | null
deleteSubscription(id)              -> boolean   (persist delete + drop buffer)
takeEvents(id, max)                 -> [event]   (drain up to max from buffer)
attachStream(id, sink)              -> detach fn (SSE push)
```

## Endpoint Behavior

Base path is `transports.api.path` default `/aep/api`.

### POST {base}/subscriptions

Request body: `{ "filter": { ... } }` or a bare filter object.

- Creates a subscription, persists it, returns 201 with the record.
- Invalid JSON returns 400 with `{ "error": "invalid JSON body" }`.

### GET {base}/subscriptions

Returns 200 with `{ "subscriptions": [record] }`.

### GET {base}/subscriptions/:id

Returns 200 with the record, or 404 with `{ "error": "not found" }`.

### DELETE {base}/subscriptions/:id

Returns 200 with `{ "deleted": true }`, or 404 if unknown.

### GET {base}/subscriptions/:id/events

Long-poll. Drains up to a default batch (100) of buffered events immediately and returns 200 with `{ "events": [event] }`. If empty, waits up to a timeout (default 25s) for the first event, then returns whatever is available. Unknown id returns 404.

### GET {base}/subscriptions/:id/stream

SSE. Sets `Content-Type: text/event-stream`, flushes buffered events, then streams new matching events as they arrive. Closes cleanly on client disconnect. Unknown id returns 404.

## Config

No new config fields required. Subscriptions live under the existing `transports.api` server. A buffer size option may be added later; the default is fixed at 1000.

## Error Handling

- Unknown subscription id returns 404 on all subscription routes.
- Malformed JSON on create returns 400.
- Store failures return 500 with `{ "error": "<message>" }`.
- SSE disconnect detaches the stream sink without affecting the buffer.

## Testing

Store tests (memory, SQLite, PostgreSQL):

- create then get returns the record.
- list returns created subscriptions.
- delete removes the record and returns true; deleting unknown returns false.

Runtime/api tests (memory and SQLite configs):

- `POST /subscriptions` returns 201 and persists.
- `GET /subscriptions` lists created subscriptions.
- `DELETE /subscriptions/:id` removes it.
- After creating a subscription and publishing a matching event, `GET /subscriptions/:id/events` returns the event.
- Non-matching events do not appear in the subscription buffer.
- `GET /subscriptions/:id/stream` receives a matching event over SSE.
- Unknown id returns 404 on get, delete, events, and stream.

PostgreSQL store subscription tests run against the live DB like existing Postgres store tests.

## Success Criteria

- HTTP clients can create subscriptions and receive matching events over SSE or long-poll.
- Subscriptions persist across restart in all three stores.
- Non-WebSocket clients get a complete subscribe-and-receive path.
- TypeScript test suite remains green.
