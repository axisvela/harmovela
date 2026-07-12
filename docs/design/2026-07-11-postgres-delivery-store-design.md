# PostgreSQL Delivery-Store Backend Design

Date: 2026-07-11
Status: approved for implementation

## Goal

Add a `PostgresDeliveryStore` in all four reference languages (TypeScript, Python, Go, Java) as a networked, production-grade durable delivery-store backend. It mirrors the existing `SqliteDeliveryStore` in each language and satisfies the same delivery-store contract, so it is a drop-in durable alternative for deployments that need a shared, networked database rather than an embedded file.

## Background

Every language already ships two delivery-store backends:

- `InMemoryDeliveryStore` â€?volatile, process-local.
- `SqliteDeliveryStore` â€?embedded, file- or memory-backed.

No language has a networked production database backend. PostgreSQL fills that gap: a shared, durable, concurrent store suitable for multi-process deployments.

The delivery-store contract (already established by SQLite/in-memory stores) is:

```
track(eventId, subscriptionId) -> sequence
ack(eventId) -> bool
nack(eventId) -> newAttempts | false
deadLetter(eventId, reason) -> deadLetterEvent | null
getPending() -> [pendingEntry]
getPendingForSubscription(subscriptionId) -> [pendingEntry]
isAcknowledged(eventId) -> bool
isPending(eventId) -> bool
hasAttemptsRemaining(eventId, maxAttempts) -> bool
getStats() -> { totalSequences, pending, acknowledged, deadLettered, lastAckCursor }
nextSequence() -> int
close()
```

Go and Java express this as an explicit `DeliveryStore` interface; TypeScript and Python rely on duck typing. The Postgres store conforms to the same surface in each language.

## Schema

Reuse the proven four-table layout from SQLite, with PostgreSQL-native types:

- `delivery_pending` (event_id PK, subscription_id, seq BIGINT, cursor, attempts INT, first_attempt_at, last_attempt_at)
- `delivery_acked` (event_id PK, cursor, acked_at)
- `delivery_dead_lettered` (event_id PK, subscription_id, seq BIGINT, cursor, attempts INT, last_attempt_at, reason JSONB, dead_lettered_at)
- `delivery_meta` (key PK, value)

Timestamps are stored as ISO-8601 text (`TIMESTAMPTZ` is acceptable but text keeps parity with SQLite and avoids driver-specific timestamp handling). `reason` uses `JSONB`. The sequence counter is held in memory per store instance (identical to SQLite), so `nextSequence()` increments a local counter; the schema does not need a Postgres sequence object.

Tables are created with `CREATE TABLE IF NOT EXISTS` on construction, so construction is idempotent.

## Table Isolation

Because a single shared Postgres database may host many concurrent or repeated test runs, table names are namespaced per store instance. The constructor accepts an optional table prefix (or derives one). Concrete approach:

- Store holds a `tablePrefix` (default `delivery`). All four table names are `<prefix>_pending`, `<prefix>_acked`, `<prefix>_dead_lettered`, `<prefix>_meta`.
- Tests pass a unique prefix per run (e.g. `delivery_<random token>`), guaranteeing isolation, and `DROP TABLE` those tables on `close()` when a test-owned prefix is used.

Production callers use the default prefix and shared tables; `close()` does not drop tables in that case. A `dropOnClose` flag (default false) controls destructive teardown so tests opt in explicitly.

## Connection

Constructor signature per language mirrors SQLite but takes a Postgres connection URL:

- TS: `new PostgresDeliveryStore(url, { streamId, tablePrefix, dropOnClose })`
- Python: `PostgresDeliveryStore(url, stream_id="stream_01", table_prefix="delivery", drop_on_close=False)`
- Go: `NewPostgresDeliveryStore(url, streamId, opts...) (*PostgresDeliveryStore, error)`
- Java: `new PostgresDeliveryStore(url, streamId, tablePrefix, dropOnClose)`

Default test connection URL: `postgres://postgres:postgres@localhost:5433/postgres`, overridable via the `AEP_POSTGRES_URL` environment variable.

## Drivers

| Language | Driver | Dependency change |
|---|---|---|
| TypeScript | `pg` | add to `implementations/typescript/package.json` |
| Python | `psycopg` (v3) | add optional `postgres` extra to `pyproject.toml` |
| Go | `github.com/jackc/pgx/v5` (stdlib `database/sql` via `pgx/v5/stdlib`) | add to `go.mod` |
| Java | `org.postgresql:postgresql` JDBC | add to `implementations/java/pom.xml` |

## TypeScript Async Exception

`better-sqlite3` is synchronous, so the SQLite store and `DeliveryTracker` are synchronous. The Node `pg` driver is async-only. Therefore:

- The TypeScript `PostgresDeliveryStore` exposes **async** methods (`await store.track(...)`, etc.).
- It is a standalone durable store, tested directly. It is **not** wired into the synchronous `DeliveryTracker` in this round. DeliveryTracker integration for async stores is deferred to a future async-tracker effort.
- Go, Python, and Java drivers are synchronous, so their Postgres stores stay synchronous and remain `DeliveryTracker`-compatible, exactly like their SQLite stores.

## Testing

Tests require a live PostgreSQL server (per decision). Behavior:

- Connect to `AEP_POSTGRES_URL` or the default `postgres://postgres:postgres@localhost:5433/postgres`.
- Each test (or test file) uses a unique table prefix and unique `stream_id`, and sets `dropOnClose` so tables are dropped on teardown.
- Coverage mirrors the SQLite test suite: trackâ†’ack, trackâ†’nack (attempt increment), trackâ†’dead-letter, `getPendingForSubscription` filtering, `hasAttemptsRemaining`, and `getStats`.
- Tests fail (not skip) if the server is unreachable.

## Non-Goals

- No changes to delivery/reliability spec semantics.
- No async `DeliveryTracker` in this round (TypeScript store stays standalone).
- No connection pooling tuning beyond driver defaults.
- No migration tooling; schema is created idempotently at construction.

## Verification

- TypeScript: `cd implementations/typescript && npm test`
- Python: `cd implementations/python && python -m pytest`
- Go: `cd implementations/go && go test ./...`
- Java: `cd implementations/java && mvn test`

All four suites must pass with the live Postgres at `localhost:5433`.
