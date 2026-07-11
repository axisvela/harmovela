# PostgreSQL Delivery-Store Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `PostgresDeliveryStore` in all four reference languages that mirrors the existing `SqliteDeliveryStore` contract, backed by a networked PostgreSQL database.

**Architecture:** Each language gets a new store class/struct that implements the same delivery-store surface (`track`, `ack`, `nack`, `deadLetter`, `getPending`, `getPendingForSubscription`, `isAcknowledged`, `isPending`, `hasAttemptsRemaining`, `getStats`, `nextSequence`, `close`). Schema reuses the proven 4-table layout with Postgres types (BIGINT sequences, JSONB reason, `ON CONFLICT` upserts). Tables are namespaced by a per-instance prefix so shared-DB test runs never collide; `dropOnClose` teardown drops test tables. TypeScript's store is async (the `pg` driver is async-only) and standalone; Go/Python/Java stay synchronous and remain `DeliveryTracker`-compatible.

**Tech Stack:** PostgreSQL 18 at `localhost:5433` (postgres/postgres); drivers `pg` (TS), `psycopg` v3 (Python), `pgx/v5` (Go), PostgreSQL JDBC (Java).

**Design reference:** `docs/superpowers/specs/2026-07-11-postgres-delivery-store-design.md`

---

## Conventions For All Tasks

- Default test connection URL: `postgres://postgres:postgres@localhost:5433/postgres`, overridable via the `AEP_POSTGRES_URL` environment variable.
- Each test uses a unique table prefix (e.g. `test_<random>`) and passes `dropOnClose=true` so its tables are dropped on `close()`.
- Table names derive from prefix: `<prefix>_pending`, `<prefix>_acked`, `<prefix>_dead_lettered`, `<prefix>_meta`. Default prefix is `delivery`.
- Postgres uses `$1,$2,...` placeholders (not `?`) and `INSERT ... ON CONFLICT (event_id) DO ...` for upserts.
- Timestamps stored as ISO-8601 text (parity with SQLite). `reason` column is `JSONB`.
- The sequence counter is an in-memory per-instance integer (identical to SQLite stores).

---

## Task 1: Go PostgresDeliveryStore

**Files:**
- Modify: `reference/go/go.mod` (add `github.com/jackc/pgx/v5`)
- Create: `reference/go/aep/delivery_postgres.go`
- Test: `reference/go/aep/delivery_postgres_test.go`

- [ ] **Step 1: Add the pgx dependency**

Run: `cd reference/go && go get github.com/jackc/pgx/v5/stdlib@latest`
Expected: `go.mod` gains `github.com/jackc/pgx/v5` in the require block.

- [ ] **Step 2: Write the failing test**

Create `reference/go/aep/delivery_postgres_test.go`:

```go
package aep

import (
	"fmt"
	"math/rand"
	"os"
	"testing"
)

func pgURL() string {
	if v := os.Getenv("AEP_POSTGRES_URL"); v != "" {
		return v
	}
	return "postgres://postgres:postgres@localhost:5433/postgres"
}

func newTestPgStore(t *testing.T) *PostgresDeliveryStore {
	t.Helper()
	prefix := fmt.Sprintf("test_%d", rand.Int63())
	store, err := NewPostgresDeliveryStore(pgURL(), "stream_01", PostgresOptions{
		TablePrefix: prefix,
		DropOnClose: true,
	})
	if err != nil {
		t.Fatalf("connect postgres: %v", err)
	}
	return store
}

func TestPostgresTrackAndAck(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	seq := store.Track("evt_001", "sub_01")
	if seq != 1 {
		t.Fatalf("expected seq 1, got %d", seq)
	}
	if !store.IsPending("evt_001") {
		t.Fatal("expected pending")
	}
	if store.IsAcknowledged("evt_001") {
		t.Fatal("should not be acknowledged")
	}
	if !store.Ack("evt_001") {
		t.Fatal("ack should succeed")
	}
	if !store.IsAcknowledged("evt_001") {
		t.Fatal("expected acknowledged")
	}
	if store.IsPending("evt_001") {
		t.Fatal("should not be pending after ack")
	}
}

func TestPostgresNack(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_001", "sub_01")
	attempts, ok := store.Nack("evt_001")
	if !ok || attempts != 2 {
		t.Fatalf("expected attempts 2 ok true, got %d %v", attempts, ok)
	}
}

func TestPostgresDeadLetter(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_001", "sub_01")
	dlq := store.DeadLetter("evt_001", map[string]any{"error": map[string]any{"code": "timeout"}})
	if dlq == nil {
		t.Fatal("expected dead-letter event")
	}
	if dlq["type"] != "event.dead_lettered" {
		t.Fatalf("expected event.dead_lettered, got %v", dlq["type"])
	}
	if store.IsPending("evt_001") {
		t.Fatal("should not be pending after dead-letter")
	}
}

func TestPostgresStats(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_a", "sub_01")
	store.Track("evt_b", "sub_01")
	store.Ack("evt_a")
	store.Track("evt_c", "sub_02")
	store.DeadLetter("evt_c", nil)

	stats := store.GetStats()
	if stats["totalSequences"] != 3 {
		t.Fatalf("expected totalSequences 3, got %v", stats["totalSequences"])
	}
	if stats["pending"] != 1 {
		t.Fatalf("expected pending 1, got %v", stats["pending"])
	}
	if stats["acknowledged"] != 1 {
		t.Fatalf("expected acknowledged 1, got %v", stats["acknowledged"])
	}
	if stats["deadLettered"] != 1 {
		t.Fatalf("expected deadLettered 1, got %v", stats["deadLettered"])
	}
}

func TestPostgresGetPendingForSubscription(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_a", "sub_01")
	store.Track("evt_b", "sub_02")
	store.Track("evt_c", "sub_01")
	filtered := store.GetPendingForSubscription("sub_01")
	if len(filtered) != 2 {
		t.Fatalf("expected 2 pending for sub_01, got %d", len(filtered))
	}
}

func TestPostgresHasAttemptsRemaining(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_001", "sub_01")
	if !store.HasAttemptsRemaining("evt_001", 3) {
		t.Fatal("expected attempts remaining")
	}
	store.Nack("evt_001")
	store.Nack("evt_001")
	if store.HasAttemptsRemaining("evt_001", 3) {
		t.Fatal("expected no attempts remaining")
	}
}

func TestPostgresImplementsDeliveryStore(t *testing.T) {
	var _ DeliveryStore = (*PostgresDeliveryStore)(nil)
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd reference/go && go test ./aep/ -run Postgres`
Expected: compile error — `PostgresDeliveryStore` / `NewPostgresDeliveryStore` / `PostgresOptions` undefined.

- [ ] **Step 4: Write the implementation**

Create `reference/go/aep/delivery_postgres.go`:

```go
package aep

import (
	"database/sql"
	"encoding/json"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type PostgresOptions struct {
	TablePrefix string
	DropOnClose bool
}

type PostgresDeliveryStore struct {
	db            *sql.DB
	sequence      int
	streamID      string
	prefix        string
	dropOnClose   bool
	lastAckCursor string
}

func NewPostgresDeliveryStore(url, streamID string, opts PostgresOptions) (*PostgresDeliveryStore, error) {
	if streamID == "" {
		streamID = "stream_01"
	}
	prefix := opts.TablePrefix
	if prefix == "" {
		prefix = "delivery"
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		return nil, fmt.Errorf("pgx open: %w", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("pgx ping: %w", err)
	}
	s := &PostgresDeliveryStore{
		db:          db,
		streamID:    streamID,
		prefix:      prefix,
		dropOnClose: opts.DropOnClose,
	}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, fmt.Errorf("pg migrate: %w", err)
	}
	return s, nil
}

func (s *PostgresDeliveryStore) t(name string) string {
	return s.prefix + "_" + name
}

func (s *PostgresDeliveryStore) migrate() error {
	schema := fmt.Sprintf(`
	CREATE TABLE IF NOT EXISTS %s (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS %s (
		event_id TEXT PRIMARY KEY,
		subscription_id TEXT NOT NULL,
		seq BIGINT NOT NULL,
		cursor TEXT NOT NULL,
		attempts INT NOT NULL DEFAULT 1,
		first_attempt_at TEXT NOT NULL,
		last_attempt_at TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS %s (
		event_id TEXT PRIMARY KEY,
		cursor TEXT NOT NULL,
		acked_at TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS %s (
		event_id TEXT PRIMARY KEY,
		subscription_id TEXT NOT NULL,
		seq BIGINT NOT NULL,
		cursor TEXT NOT NULL,
		attempts INT NOT NULL,
		last_attempt_at TEXT NOT NULL,
		reason JSONB NOT NULL DEFAULT '{}',
		dead_lettered_at TEXT NOT NULL
	);`,
		s.t("meta"), s.t("pending"), s.t("acked"), s.t("dead_lettered"))
	_, err := s.db.Exec(schema)
	return err
}

func (s *PostgresDeliveryStore) Close() error {
	if s.dropOnClose {
		s.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s, %s, %s, %s",
			s.t("meta"), s.t("pending"), s.t("acked"), s.t("dead_lettered")))
	}
	return s.db.Close()
}

func (s *PostgresDeliveryStore) NextSequence() int {
	s.sequence++
	return s.sequence
}

func (s *PostgresDeliveryStore) Track(eventID, subscriptionID string) int {
	seq := s.NextSequence()
	cursor := fmt.Sprintf("%s:%d", s.streamID, seq)
	nowTS := now()
	s.db.Exec(fmt.Sprintf(
		`INSERT INTO %s (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at)
		 VALUES ($1,$2,$3,$4,1,$5,$6)
		 ON CONFLICT (event_id) DO UPDATE SET subscription_id=EXCLUDED.subscription_id, seq=EXCLUDED.seq,
		 cursor=EXCLUDED.cursor, attempts=1, first_attempt_at=EXCLUDED.first_attempt_at, last_attempt_at=EXCLUDED.last_attempt_at`,
		s.t("pending")), eventID, subscriptionID, seq, cursor, nowTS, nowTS)
	return seq
}

func (s *PostgresDeliveryStore) Ack(eventID string) bool {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT cursor FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	var cursor string
	if err := row.Scan(&cursor); err != nil {
		return false
	}
	s.db.Exec(fmt.Sprintf(`DELETE FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	s.db.Exec(fmt.Sprintf(
		`INSERT INTO %s (event_id, cursor, acked_at) VALUES ($1,$2,$3)
		 ON CONFLICT (event_id) DO UPDATE SET cursor=EXCLUDED.cursor, acked_at=EXCLUDED.acked_at`,
		s.t("acked")), eventID, cursor, now())
	s.lastAckCursor = cursor
	return true
}

func (s *PostgresDeliveryStore) Nack(eventID string) (int, bool) {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT attempts FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	var attempts int
	if err := row.Scan(&attempts); err != nil {
		return 0, false
	}
	attempts++
	s.db.Exec(fmt.Sprintf(`UPDATE %s SET attempts = $1, last_attempt_at = $2 WHERE event_id = $3`,
		s.t("pending")), attempts, now(), eventID)
	return attempts, true
}

func (s *PostgresDeliveryStore) DeadLetter(eventID string, reason map[string]any) map[string]any {
	row := s.db.QueryRow(fmt.Sprintf(
		`SELECT subscription_id, seq, cursor, attempts, last_attempt_at FROM %s WHERE event_id = $1`,
		s.t("pending")), eventID)
	var subscriptionID, cursor, lastAttemptAt string
	var seq, attempts int
	if err := row.Scan(&subscriptionID, &seq, &cursor, &attempts, &lastAttemptAt); err != nil {
		return nil
	}
	if reason == nil {
		reason = map[string]any{}
	}
	reasonJSON, _ := json.Marshal(reason)
	s.db.Exec(fmt.Sprintf(`DELETE FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	s.db.Exec(fmt.Sprintf(
		`INSERT INTO %s (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 ON CONFLICT (event_id) DO NOTHING`,
		s.t("dead_lettered")), eventID, subscriptionID, seq, cursor, attempts, lastAttemptAt, string(reasonJSON), now())

	var errorVal any
	if errVal, ok := reason["error"]; ok {
		errorVal = errVal
	}
	return map[string]any{
		"type": "event.dead_lettered",
		"payload": map[string]any{
			"original_event_id": eventID,
			"subscription_id":   subscriptionID,
			"cursor":            cursor,
			"attempts":          attempts,
			"last_attempt_at":   lastAttemptAt,
			"error":             errorVal,
		},
	}
}

func (s *PostgresDeliveryStore) scanPending(query string, args ...any) []map[string]any {
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var result []map[string]any
	for rows.Next() {
		var eventID, subscriptionID, cursor, firstAttemptAt, lastAttemptAt string
		var seq, attempts int
		if err := rows.Scan(&eventID, &subscriptionID, &seq, &cursor, &attempts, &firstAttemptAt, &lastAttemptAt); err != nil {
			continue
		}
		result = append(result, map[string]any{
			"eventId":        eventID,
			"subscriptionId": subscriptionID,
			"sequence":       seq,
			"cursor":         cursor,
			"attempts":       attempts,
			"firstAttemptAt": firstAttemptAt,
			"lastAttemptAt":  lastAttemptAt,
		})
	}
	return result
}

func (s *PostgresDeliveryStore) GetPending() []map[string]any {
	return s.scanPending(fmt.Sprintf(
		`SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at FROM %s ORDER BY seq`,
		s.t("pending")))
}

func (s *PostgresDeliveryStore) GetPendingForSubscription(subscriptionID string) []map[string]any {
	return s.scanPending(fmt.Sprintf(
		`SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at FROM %s WHERE subscription_id = $1 ORDER BY seq`,
		s.t("pending")), subscriptionID)
}

func (s *PostgresDeliveryStore) IsAcknowledged(eventID string) bool {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT 1 FROM %s WHERE event_id = $1`, s.t("acked")), eventID)
	var val int
	return row.Scan(&val) == nil
}

func (s *PostgresDeliveryStore) IsPending(eventID string) bool {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT 1 FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	var val int
	return row.Scan(&val) == nil
}

func (s *PostgresDeliveryStore) HasAttemptsRemaining(eventID string, maxAttempts int) bool {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT attempts FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	var attempts int
	if err := row.Scan(&attempts); err != nil {
		return false
	}
	return attempts < maxAttempts
}

func (s *PostgresDeliveryStore) GetStats() map[string]any {
	var pending, acknowledged, deadLettered int
	s.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, s.t("pending"))).Scan(&pending)
	s.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, s.t("acked"))).Scan(&acknowledged)
	s.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, s.t("dead_lettered"))).Scan(&deadLettered)
	lastAck := any(nil)
	if s.lastAckCursor != "" {
		lastAck = s.lastAckCursor
	}
	return map[string]any{
		"totalSequences": s.sequence,
		"pending":        pending,
		"acknowledged":   acknowledged,
		"deadLettered":   deadLettered,
		"lastAckCursor":  lastAck,
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd reference/go && go test ./aep/ -run Postgres -v`
Expected: all `TestPostgres*` PASS.

- [ ] **Step 6: Run the full Go suite**

Run: `cd reference/go && go test ./...`
Expected: `ok  github.com/axisrobo/aep/aep`.

- [ ] **Step 7: Commit**

```bash
git add reference/go/go.mod reference/go/go.sum reference/go/aep/delivery_postgres.go reference/go/aep/delivery_postgres_test.go
git commit -m "feat: add Go PostgresDeliveryStore backend"
```

---

## Task 2: Python PostgresDeliveryStore

**Files:**
- Modify: `reference/python/pyproject.toml` (add optional `postgres` extra)
- Create: `reference/python/src/aep/postgres_delivery_store.py`
- Test: `reference/python/tests/test_postgres_delivery_store.py`

- [ ] **Step 1: Add the psycopg optional dependency**

Modify `reference/python/pyproject.toml` — add under `[project.optional-dependencies]`, after the `redis` extra:

```toml
postgres = [
    "psycopg>=3",
]
```

- [ ] **Step 2: Install the driver**

Run: `cd reference/python && pip install "psycopg[binary]>=3"`
Expected: psycopg 3.x installs successfully.

- [ ] **Step 3: Write the failing test**

Create `reference/python/tests/test_postgres_delivery_store.py`:

```python
import os
import uuid
import pytest
from aep.postgres_delivery_store import PostgresDeliveryStore


def _url() -> str:
    return os.environ.get("AEP_POSTGRES_URL", "postgres://postgres:postgres@localhost:5433/postgres")


@pytest.fixture
def store():
    prefix = "test_" + uuid.uuid4().hex[:12]
    s = PostgresDeliveryStore(_url(), stream_id="stream_01", table_prefix=prefix, drop_on_close=True)
    yield s
    s.close()


def test_track_and_ack(store):
    seq = store.track("evt_001", "sub_01")
    assert seq == 1
    assert store.is_pending("evt_001")
    assert not store.is_acknowledged("evt_001")
    assert store.ack("evt_001")
    assert store.is_acknowledged("evt_001")
    assert not store.is_pending("evt_001")


def test_nack(store):
    store.track("evt_001", "sub_01")
    attempts = store.nack("evt_001")
    assert attempts == 2


def test_dead_letter(store):
    store.track("evt_001", "sub_01")
    dlq = store.dead_letter("evt_001", {"error": {"code": "timeout"}})
    assert dlq is not None
    assert dlq["type"] == "event.dead_lettered"
    assert not store.is_pending("evt_001")


def test_stats(store):
    store.track("evt_a", "sub_01")
    store.track("evt_b", "sub_01")
    store.ack("evt_a")
    store.track("evt_c", "sub_02")
    store.dead_letter("evt_c")
    stats = store.get_stats()
    assert stats["totalSequences"] == 3
    assert stats["pending"] == 1
    assert stats["acknowledged"] == 1
    assert stats["deadLettered"] == 1


def test_get_pending_for_subscription(store):
    store.track("evt_a", "sub_01")
    store.track("evt_b", "sub_02")
    store.track("evt_c", "sub_01")
    assert len(store.get_pending_for_subscription("sub_01")) == 2


def test_has_attempts_remaining(store):
    store.track("evt_001", "sub_01")
    assert store.has_attempts_remaining("evt_001", 3)
    store.nack("evt_001")
    store.nack("evt_001")
    assert not store.has_attempts_remaining("evt_001", 3)
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd reference/python && python -m pytest tests/test_postgres_delivery_store.py -v`
Expected: `ModuleNotFoundError: No module named 'aep.postgres_delivery_store'`.

- [ ] **Step 5: Write the implementation**

Create `reference/python/src/aep/postgres_delivery_store.py`:

```python
import json
from datetime import datetime, timezone

import psycopg


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class PostgresDeliveryStore:
    def __init__(self, url: str, stream_id: str = "stream_01",
                 table_prefix: str = "delivery", drop_on_close: bool = False):
        self._conn = psycopg.connect(url, autocommit=True)
        self._stream_id = stream_id
        self._prefix = table_prefix
        self._drop_on_close = drop_on_close
        self._sequence = 0
        self._init_schema()

    def _t(self, name: str) -> str:
        return f"{self._prefix}_{name}"

    def _init_schema(self):
        with self._conn.cursor() as cur:
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {self._t('meta')} (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS {self._t('pending')} (
                    event_id TEXT PRIMARY KEY,
                    subscription_id TEXT NOT NULL,
                    seq BIGINT NOT NULL,
                    cursor TEXT NOT NULL,
                    attempts INT NOT NULL DEFAULT 1,
                    first_attempt_at TEXT NOT NULL,
                    last_attempt_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS {self._t('acked')} (
                    event_id TEXT PRIMARY KEY,
                    cursor TEXT NOT NULL,
                    acked_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS {self._t('dead_lettered')} (
                    event_id TEXT PRIMARY KEY,
                    subscription_id TEXT NOT NULL,
                    seq BIGINT NOT NULL,
                    cursor TEXT NOT NULL,
                    attempts INT NOT NULL,
                    last_attempt_at TEXT NOT NULL,
                    reason JSONB NOT NULL DEFAULT '{{}}',
                    dead_lettered_at TEXT NOT NULL
                );
            """)

    def next_sequence(self) -> int:
        self._sequence += 1
        return self._sequence

    def track(self, event_id: str, subscription_id: str = "_default") -> int:
        seq = self.next_sequence()
        now = _now()
        cursor = f"{self._stream_id}:{seq}"
        with self._conn.cursor() as cur:
            cur.execute(
                f"""INSERT INTO {self._t('pending')}
                    (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at)
                    VALUES (%s,%s,%s,%s,1,%s,%s)
                    ON CONFLICT (event_id) DO UPDATE SET
                    subscription_id=EXCLUDED.subscription_id, seq=EXCLUDED.seq, cursor=EXCLUDED.cursor,
                    attempts=1, first_attempt_at=EXCLUDED.first_attempt_at, last_attempt_at=EXCLUDED.last_attempt_at""",
                (event_id, subscription_id, seq, cursor, now, now),
            )
        return seq

    def ack(self, event_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT cursor FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            row = cur.fetchone()
            if row is None:
                return False
            cursor = row[0]
            cur.execute(f"DELETE FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            cur.execute(
                f"""INSERT INTO {self._t('acked')} (event_id, cursor, acked_at) VALUES (%s,%s,%s)
                    ON CONFLICT (event_id) DO UPDATE SET cursor=EXCLUDED.cursor, acked_at=EXCLUDED.acked_at""",
                (event_id, cursor, _now()),
            )
            cur.execute(
                f"""INSERT INTO {self._t('meta')} (key, value) VALUES ('last_ack_cursor', %s)
                    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value""",
                (cursor,),
            )
        return True

    def nack(self, event_id: str) -> int | bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT attempts FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            row = cur.fetchone()
            if row is None:
                return False
            attempts = row[0] + 1
            cur.execute(
                f"UPDATE {self._t('pending')} SET attempts = %s, last_attempt_at = %s WHERE event_id = %s",
                (attempts, _now(), event_id),
            )
        return attempts

    def dead_letter(self, event_id: str, reason: dict | None = None) -> dict | None:
        if reason is None:
            reason = {}
        with self._conn.cursor() as cur:
            cur.execute(
                f"SELECT subscription_id, seq, cursor, attempts, last_attempt_at FROM {self._t('pending')} WHERE event_id = %s",
                (event_id,),
            )
            row = cur.fetchone()
            if row is None:
                return None
            subscription_id, seq, cursor, attempts, last_attempt_at = row
            cur.execute(f"DELETE FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            cur.execute(
                f"""INSERT INTO {self._t('dead_lettered')}
                    (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (event_id) DO NOTHING""",
                (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, json.dumps(reason), _now()),
            )
        return {
            "type": "event.dead_lettered",
            "payload": {
                "original_event_id": event_id,
                "subscription_id": subscription_id,
                "cursor": cursor,
                "attempts": attempts,
                "last_attempt_at": last_attempt_at,
                "error": reason.get("error"),
            },
        }

    def _rows_to_pending(self, rows) -> list[dict]:
        return [
            {
                "eventId": r[0],
                "subscriptionId": r[1],
                "sequence": r[2],
                "cursor": r[3],
                "attempts": r[4],
                "firstAttemptAt": r[5],
                "lastAttemptAt": r[6],
            }
            for r in rows
        ]

    def get_pending(self) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute(
                f"SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at "
                f"FROM {self._t('pending')} ORDER BY seq"
            )
            return self._rows_to_pending(cur.fetchall())

    def get_pending_for_subscription(self, subscription_id: str) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute(
                f"SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at "
                f"FROM {self._t('pending')} WHERE subscription_id = %s ORDER BY seq",
                (subscription_id,),
            )
            return self._rows_to_pending(cur.fetchall())

    def is_acknowledged(self, event_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT 1 FROM {self._t('acked')} WHERE event_id = %s", (event_id,))
            return cur.fetchone() is not None

    def is_pending(self, event_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT 1 FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            return cur.fetchone() is not None

    def has_attempts_remaining(self, event_id: str, max_attempts: int) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT attempts FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            row = cur.fetchone()
            if row is None:
                return False
            return row[0] < max_attempts

    def get_stats(self) -> dict:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {self._t('pending')}")
            pending = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {self._t('acked')}")
            acked = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {self._t('dead_lettered')}")
            dlq = cur.fetchone()[0]
            cur.execute(f"SELECT value FROM {self._t('meta')} WHERE key = 'last_ack_cursor'")
            meta = cur.fetchone()
        return {
            "totalSequences": self._sequence,
            "pending": pending,
            "acknowledged": acked,
            "deadLettered": dlq,
            "lastAckCursor": meta[0] if meta else None,
        }

    def close(self):
        if self._drop_on_close:
            with self._conn.cursor() as cur:
                cur.execute(
                    f"DROP TABLE IF EXISTS {self._t('meta')}, {self._t('pending')}, "
                    f"{self._t('acked')}, {self._t('dead_lettered')}"
                )
        self._conn.close()
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd reference/python && python -m pytest tests/test_postgres_delivery_store.py -v`
Expected: all 6 tests PASS.

- [ ] **Step 7: Run the full Python suite**

Run: `cd reference/python && python -m pytest`
Expected: all tests pass (previous 128 + 6 new = 134).

- [ ] **Step 8: Commit**

```bash
git add reference/python/pyproject.toml reference/python/src/aep/postgres_delivery_store.py reference/python/tests/test_postgres_delivery_store.py
git commit -m "feat: add Python PostgresDeliveryStore backend"
```

---

## Task 3: TypeScript PostgresDeliveryStore (async, standalone)

**Files:**
- Modify: `reference/typescript/package.json` (add `pg` dependency)
- Create: `reference/typescript/src/delivery-store-postgres.js`
- Test: `reference/typescript/test/delivery-store-postgres.test.js`

- [ ] **Step 1: Add the pg dependency**

Run: `cd reference/typescript && npm install pg`
Expected: `pg` added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

Create `reference/typescript/test/delivery-store-postgres.test.js`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { PostgresDeliveryStore } from "../src/delivery-store-postgres.js";

function pgUrl() {
  return process.env.AEP_POSTGRES_URL ?? "postgres://postgres:postgres@localhost:5433/postgres";
}

async function newStore() {
  const prefix = "test_" + randomBytes(6).toString("hex");
  const store = new PostgresDeliveryStore(pgUrl(), { streamId: "stream_01", tablePrefix: prefix, dropOnClose: true });
  await store.init();
  return store;
}

test("PostgresDeliveryStore tracks and acknowledges events", async () => {
  const store = await newStore();
  const seq = await store.track("evt_001", "sub_01");
  assert.equal(seq, 1);
  assert.equal(await store.isPending("evt_001"), true);
  assert.equal(await store.isAcknowledged("evt_001"), false);
  assert.equal(await store.ack("evt_001"), true);
  assert.equal(await store.isAcknowledged("evt_001"), true);
  assert.equal(await store.isPending("evt_001"), false);
  await store.close();
});

test("PostgresDeliveryStore nacks and increments attempts", async () => {
  const store = await newStore();
  await store.track("evt_001", "sub_01");
  const attempts = await store.nack("evt_001");
  assert.equal(attempts, 2);
  await store.close();
});

test("PostgresDeliveryStore dead-letters events", async () => {
  const store = await newStore();
  await store.track("evt_001", "sub_01");
  const dlq = await store.deadLetter("evt_001", { error: { code: "timeout" } });
  assert.ok(dlq);
  assert.equal(dlq.type, "event.dead_lettered");
  assert.equal(await store.isPending("evt_001"), false);
  await store.close();
});

test("PostgresDeliveryStore provides stats", async () => {
  const store = await newStore();
  await store.track("evt_a", "sub_01");
  await store.track("evt_b", "sub_01");
  await store.ack("evt_a");
  await store.track("evt_c", "sub_02");
  await store.deadLetter("evt_c");
  const stats = await store.getStats();
  assert.equal(stats.totalSequences, 3);
  assert.equal(stats.pending, 1);
  assert.equal(stats.acknowledged, 1);
  assert.equal(stats.deadLettered, 1);
  await store.close();
});

test("PostgresDeliveryStore getPendingForSubscription filters", async () => {
  const store = await newStore();
  await store.track("evt_a", "sub_01");
  await store.track("evt_b", "sub_02");
  await store.track("evt_c", "sub_01");
  const filtered = await store.getPendingForSubscription("sub_01");
  assert.equal(filtered.length, 2);
  await store.close();
});

test("PostgresDeliveryStore hasAttemptsRemaining checks max", async () => {
  const store = await newStore();
  await store.track("evt_001", "sub_01");
  assert.equal(await store.hasAttemptsRemaining("evt_001", 3), true);
  await store.nack("evt_001");
  await store.nack("evt_001");
  assert.equal(await store.hasAttemptsRemaining("evt_001", 3), false);
  await store.close();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd reference/typescript && node --test test/delivery-store-postgres.test.js`
Expected: FAIL — cannot find module `../src/delivery-store-postgres.js`.

- [ ] **Step 4: Write the implementation**

Create `reference/typescript/src/delivery-store-postgres.js`:

```javascript
import pg from "pg";

const { Client } = pg;

export class PostgresDeliveryStore {
  constructor(url, options = {}) {
    this._client = new Client({ connectionString: url });
    this._streamId = options.streamId ?? "stream_01";
    this._prefix = options.tablePrefix ?? "delivery";
    this._dropOnClose = options.dropOnClose ?? false;
    this._sequence = 0;
    this._lastAckCursor = null;
    this._connected = false;
  }

  _t(name) {
    return `${this._prefix}_${name}`;
  }

  async init() {
    if (this._connected) return;
    await this._client.connect();
    this._connected = true;
    await this._client.query(`
      CREATE TABLE IF NOT EXISTS ${this._t("meta")} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${this._t("pending")} (
        event_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        seq BIGINT NOT NULL,
        cursor TEXT NOT NULL,
        attempts INT NOT NULL DEFAULT 1,
        first_attempt_at TEXT NOT NULL,
        last_attempt_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${this._t("acked")} (
        event_id TEXT PRIMARY KEY,
        cursor TEXT NOT NULL,
        acked_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${this._t("dead_lettered")} (
        event_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        seq BIGINT NOT NULL,
        cursor TEXT NOT NULL,
        attempts INT NOT NULL,
        last_attempt_at TEXT NOT NULL,
        reason JSONB NOT NULL DEFAULT '{}',
        dead_lettered_at TEXT NOT NULL
      );
    `);
  }

  nextSequence() {
    return ++this._sequence;
  }

  async track(eventId, subscriptionId = "_default") {
    const seq = this.nextSequence();
    const now = new Date().toISOString();
    const cursor = `${this._streamId}:${seq}`;
    await this._client.query(
      `INSERT INTO ${this._t("pending")}
       (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at)
       VALUES ($1,$2,$3,$4,1,$5,$6)
       ON CONFLICT (event_id) DO UPDATE SET
       subscription_id=EXCLUDED.subscription_id, seq=EXCLUDED.seq, cursor=EXCLUDED.cursor,
       attempts=1, first_attempt_at=EXCLUDED.first_attempt_at, last_attempt_at=EXCLUDED.last_attempt_at`,
      [eventId, subscriptionId, seq, cursor, now, now]
    );
    return seq;
  }

  async ack(eventId) {
    const res = await this._client.query(
      `SELECT cursor FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    if (res.rowCount === 0) return false;
    const cursor = res.rows[0].cursor;
    await this._client.query(`DELETE FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    await this._client.query(
      `INSERT INTO ${this._t("acked")} (event_id, cursor, acked_at) VALUES ($1,$2,$3)
       ON CONFLICT (event_id) DO UPDATE SET cursor=EXCLUDED.cursor, acked_at=EXCLUDED.acked_at`,
      [eventId, cursor, new Date().toISOString()]
    );
    await this._client.query(
      `INSERT INTO ${this._t("meta")} (key, value) VALUES ('last_ack_cursor', $1)
       ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
      [cursor]
    );
    this._lastAckCursor = cursor;
    return true;
  }

  async nack(eventId) {
    const res = await this._client.query(
      `SELECT attempts FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    if (res.rowCount === 0) return false;
    const attempts = res.rows[0].attempts + 1;
    await this._client.query(
      `UPDATE ${this._t("pending")} SET attempts = $1, last_attempt_at = $2 WHERE event_id = $3`,
      [attempts, new Date().toISOString(), eventId]
    );
    return attempts;
  }

  async deadLetter(eventId, reason = {}) {
    const res = await this._client.query(
      `SELECT subscription_id, seq, cursor, attempts, last_attempt_at
       FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    await this._client.query(`DELETE FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    await this._client.query(
      `INSERT INTO ${this._t("dead_lettered")}
       (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, row.subscription_id, row.seq, row.cursor, row.attempts, row.last_attempt_at,
       JSON.stringify(reason), new Date().toISOString()]
    );
    return {
      type: "event.dead_lettered",
      payload: {
        original_event_id: eventId,
        subscription_id: row.subscription_id,
        cursor: row.cursor,
        attempts: row.attempts,
        last_attempt_at: row.last_attempt_at,
        error: reason.error ?? null
      }
    };
  }

  async getPending() {
    const res = await this._client.query(
      `SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at
       FROM ${this._t("pending")} ORDER BY seq`);
    return res.rows.map(rowToPending);
  }

  async getPendingForSubscription(subscriptionId) {
    const res = await this._client.query(
      `SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at
       FROM ${this._t("pending")} WHERE subscription_id = $1 ORDER BY seq`, [subscriptionId]);
    return res.rows.map(rowToPending);
  }

  async isAcknowledged(eventId) {
    const res = await this._client.query(
      `SELECT 1 FROM ${this._t("acked")} WHERE event_id = $1`, [eventId]);
    return res.rowCount > 0;
  }

  async isPending(eventId) {
    const res = await this._client.query(
      `SELECT 1 FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    return res.rowCount > 0;
  }

  async hasAttemptsRemaining(eventId, maxAttempts) {
    const res = await this._client.query(
      `SELECT attempts FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    if (res.rowCount === 0) return false;
    return res.rows[0].attempts < maxAttempts;
  }

  async getStats() {
    const pending = await this._count("pending");
    const acked = await this._count("acked");
    const dlq = await this._count("dead_lettered");
    const meta = await this._client.query(
      `SELECT value FROM ${this._t("meta")} WHERE key = 'last_ack_cursor'`);
    return {
      totalSequences: this._sequence,
      pending,
      acknowledged: acked,
      deadLettered: dlq,
      lastAckCursor: meta.rowCount > 0 ? meta.rows[0].value : null
    };
  }

  async _count(name) {
    const res = await this._client.query(`SELECT COUNT(*)::int AS c FROM ${this._t(name)}`);
    return res.rows[0].c;
  }

  async close() {
    if (this._dropOnClose) {
      await this._client.query(
        `DROP TABLE IF EXISTS ${this._t("meta")}, ${this._t("pending")}, ` +
        `${this._t("acked")}, ${this._t("dead_lettered")}`);
    }
    await this._client.end();
  }
}

function rowToPending(row) {
  return {
    eventId: row.event_id,
    subscriptionId: row.subscription_id,
    sequence: Number(row.seq),
    cursor: row.cursor,
    attempts: row.attempts,
    firstAttemptAt: row.first_attempt_at,
    lastAttemptAt: row.last_attempt_at
  };
}
```

Note: `pg` returns `BIGINT` columns as strings; `getStats` uses `COUNT(*)::int` to get numbers, and `rowToPending` wraps `seq` in `Number(...)`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd reference/typescript && node --test test/delivery-store-postgres.test.js`
Expected: all 6 tests PASS.

- [ ] **Step 6: Run the full TypeScript suite**

Run: `cd reference/typescript && npm test`
Expected: all tests pass (previous 133 + 6 new = 139).

- [ ] **Step 7: Commit**

```bash
git add reference/typescript/package.json reference/typescript/package-lock.json reference/typescript/src/delivery-store-postgres.js reference/typescript/test/delivery-store-postgres.test.js
git commit -m "feat: add TypeScript PostgresDeliveryStore backend (async standalone)"
```

---

## Task 4: Java PostgresDeliveryStore

**Files:**
- Modify: `reference/java/pom.xml` (add PostgreSQL JDBC dependency)
- Create: `reference/java/src/main/java/com/axisrobo/aep/PostgresDeliveryStore.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/PostgresDeliveryStoreTest.java`

- [ ] **Step 1: Add the PostgreSQL JDBC dependency**

Modify `reference/java/pom.xml` — add after the `sqlite-jdbc` dependency (closes at line 32):

```xml
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <version>42.7.4</version>
        </dependency>
```

- [ ] **Step 2: Write the failing test**

Create `reference/java/src/test/java/com/axisrobo/aep/PostgresDeliveryStoreTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class PostgresDeliveryStoreTest {

    private PostgresDeliveryStore store;

    private static String url() {
        var env = System.getenv("AEP_POSTGRES_URL");
        return env != null ? env : "jdbc:postgresql://localhost:5433/postgres?user=postgres&password=postgres";
    }

    @BeforeEach
    void setUp() throws Exception {
        var prefix = "test_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        store = new PostgresDeliveryStore(url(), "stream_01", prefix, true);
    }

    @AfterEach
    void tearDown() throws Exception {
        store.close();
    }

    @Test
    void trackAndAck() {
        var seq = store.track("evt_001", "sub_01");
        assertEquals(1, seq);
        assertTrue(store.isPending("evt_001"));
        assertFalse(store.isAcknowledged("evt_001"));
        assertTrue(store.ack("evt_001"));
        assertTrue(store.isAcknowledged("evt_001"));
        assertFalse(store.isPending("evt_001"));
    }

    @Test
    void nack() {
        store.track("evt_001", "sub_01");
        assertEquals(2, store.nack("evt_001"));
    }

    @Test
    void deadLetter() {
        store.track("evt_001", "sub_01");
        var dlq = store.deadLetter("evt_001", Map.of("error", Map.of("code", "timeout")));
        assertNotNull(dlq);
        assertEquals("event.dead_lettered", dlq.get("type"));
        assertFalse(store.isPending("evt_001"));
    }

    @Test
    void stats() {
        store.track("evt_a", "sub_01");
        store.track("evt_b", "sub_01");
        store.ack("evt_a");
        store.track("evt_c", "sub_02");
        store.deadLetter("evt_c", null);
        var stats = store.getStats();
        assertEquals(3, stats.get("totalSequences"));
        assertEquals(1, stats.get("pending"));
        assertEquals(1, stats.get("acknowledged"));
        assertEquals(1, stats.get("deadLettered"));
    }

    @Test
    void getPendingForSubscription() {
        store.track("evt_a", "sub_01");
        store.track("evt_b", "sub_02");
        store.track("evt_c", "sub_01");
        assertEquals(2, store.getPendingForSubscription("sub_01").size());
    }

    @Test
    void hasAttemptsRemaining() {
        store.track("evt_001", "sub_01");
        assertTrue(store.hasAttemptsRemaining("evt_001", 3));
        store.nack("evt_001");
        store.nack("evt_001");
        assertFalse(store.hasAttemptsRemaining("evt_001", 3));
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=PostgresDeliveryStoreTest`
Expected: compilation failure — `PostgresDeliveryStore` does not exist.

- [ ] **Step 4: Write the implementation**

Create `reference/java/src/main/java/com/axisrobo/aep/PostgresDeliveryStore.java`:

```java
package com.axisrobo.aep;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.*;
import java.time.Instant;
import java.util.*;

public class PostgresDeliveryStore implements DeliveryStore {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String streamId;
    private final String prefix;
    private final boolean dropOnClose;
    private final Connection conn;
    private int sequence;
    private String lastAckCursor;

    public PostgresDeliveryStore(String url, String streamId, String tablePrefix, boolean dropOnClose)
            throws SQLException {
        this.streamId = streamId == null || streamId.isEmpty() ? "stream_01" : streamId;
        this.prefix = tablePrefix == null || tablePrefix.isEmpty() ? "delivery" : tablePrefix;
        this.dropOnClose = dropOnClose;
        this.conn = DriverManager.getConnection(url);
        initSchema();
    }

    private String t(String name) {
        return prefix + "_" + name;
    }

    private void initSchema() throws SQLException {
        try (var stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE IF NOT EXISTS " + t("meta") + " ("
                + "key TEXT PRIMARY KEY, value TEXT NOT NULL)");
            stmt.execute("CREATE TABLE IF NOT EXISTS " + t("pending") + " ("
                + "event_id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL, seq BIGINT NOT NULL, "
                + "cursor TEXT NOT NULL, attempts INT NOT NULL DEFAULT 1, "
                + "first_attempt_at TEXT NOT NULL, last_attempt_at TEXT NOT NULL)");
            stmt.execute("CREATE TABLE IF NOT EXISTS " + t("acked") + " ("
                + "event_id TEXT PRIMARY KEY, cursor TEXT NOT NULL, acked_at TEXT NOT NULL)");
            stmt.execute("CREATE TABLE IF NOT EXISTS " + t("dead_lettered") + " ("
                + "event_id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL, seq BIGINT NOT NULL, "
                + "cursor TEXT NOT NULL, attempts INT NOT NULL, last_attempt_at TEXT NOT NULL, "
                + "reason JSONB NOT NULL DEFAULT '{}', dead_lettered_at TEXT NOT NULL)");
        }
    }

    public int nextSequence() {
        return ++sequence;
    }

    public int track(String eventId, String subscriptionId) {
        var seq = nextSequence();
        var now = Instant.now().toString();
        var cursor = streamId + ":" + seq;
        try (var stmt = conn.prepareStatement(
                "INSERT INTO " + t("pending") + " (event_id, subscription_id, seq, cursor, attempts, "
                + "first_attempt_at, last_attempt_at) VALUES (?,?,?,?,1,?,?) "
                + "ON CONFLICT (event_id) DO UPDATE SET subscription_id=EXCLUDED.subscription_id, "
                + "seq=EXCLUDED.seq, cursor=EXCLUDED.cursor, attempts=1, "
                + "first_attempt_at=EXCLUDED.first_attempt_at, last_attempt_at=EXCLUDED.last_attempt_at")) {
            stmt.setString(1, eventId);
            stmt.setString(2, subscriptionId);
            stmt.setLong(3, seq);
            stmt.setString(4, cursor);
            stmt.setString(5, now);
            stmt.setString(6, now);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("track failed", e);
        }
        return seq;
    }

    public boolean ack(String eventId) {
        var entry = getPendingEntry(eventId);
        if (entry == null) return false;
        try {
            try (var stmt = conn.prepareStatement("DELETE FROM " + t("pending") + " WHERE event_id = ?")) {
                stmt.setString(1, eventId);
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO " + t("acked") + " (event_id, cursor, acked_at) VALUES (?,?,?) "
                    + "ON CONFLICT (event_id) DO UPDATE SET cursor=EXCLUDED.cursor, acked_at=EXCLUDED.acked_at")) {
                stmt.setString(1, eventId);
                stmt.setString(2, entry.get("cursor"));
                stmt.setString(3, Instant.now().toString());
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO " + t("meta") + " (key, value) VALUES ('last_ack_cursor', ?) "
                    + "ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value")) {
                stmt.setString(1, entry.get("cursor"));
                stmt.executeUpdate();
            }
        } catch (SQLException e) {
            throw new RuntimeException("ack failed", e);
        }
        lastAckCursor = entry.get("cursor");
        return true;
    }

    public Object nack(String eventId) {
        var entry = getPendingEntry(eventId);
        if (entry == null) return false;
        var attempts = Integer.parseInt(entry.get("attempts")) + 1;
        var now = Instant.now().toString();
        try (var stmt = conn.prepareStatement(
                "UPDATE " + t("pending") + " SET attempts = ?, last_attempt_at = ? WHERE event_id = ?")) {
            stmt.setInt(1, attempts);
            stmt.setString(2, now);
            stmt.setString(3, eventId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("nack failed", e);
        }
        return attempts;
    }

    public Map<String, Object> deadLetter(String eventId, Map<String, Object> reason) {
        var entry = getPendingEntry(eventId);
        if (entry == null) return null;
        if (reason == null) reason = Map.of();
        var now = Instant.now().toString();
        String reasonJson;
        try {
            reasonJson = MAPPER.writeValueAsString(reason);
        } catch (Exception e) {
            throw new RuntimeException("reason serialize failed", e);
        }
        try {
            try (var stmt = conn.prepareStatement("DELETE FROM " + t("pending") + " WHERE event_id = ?")) {
                stmt.setString(1, eventId);
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO " + t("dead_lettered") + " (event_id, subscription_id, seq, cursor, "
                    + "attempts, last_attempt_at, reason, dead_lettered_at) VALUES (?,?,?,?,?,?,?::jsonb,?) "
                    + "ON CONFLICT (event_id) DO NOTHING")) {
                stmt.setString(1, eventId);
                stmt.setString(2, entry.get("subscription_id"));
                stmt.setLong(3, Long.parseLong(entry.get("seq")));
                stmt.setString(4, entry.get("cursor"));
                stmt.setInt(5, Integer.parseInt(entry.get("attempts")));
                stmt.setString(6, entry.get("last_attempt_at"));
                stmt.setString(7, reasonJson);
                stmt.setString(8, now);
                stmt.executeUpdate();
            }
        } catch (SQLException e) {
            throw new RuntimeException("deadLetter failed", e);
        }
        var payload = new LinkedHashMap<String, Object>();
        payload.put("original_event_id", eventId);
        payload.put("subscription_id", entry.get("subscription_id"));
        payload.put("cursor", entry.get("cursor"));
        payload.put("attempts", Integer.parseInt(entry.get("attempts")));
        payload.put("last_attempt_at", entry.get("last_attempt_at"));
        payload.put("error", reason.get("error"));
        return Map.of("type", "event.dead_lettered", "payload", payload);
    }

    public List<Map<String, Object>> getPending() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement("SELECT * FROM " + t("pending") + " ORDER BY seq");
             var rs = stmt.executeQuery()) {
            while (rs.next()) result.add(rowToPendingMap(rs));
        } catch (SQLException e) {
            throw new RuntimeException("getPending failed", e);
        }
        return result;
    }

    public List<Map<String, Object>> getPendingForSubscription(String subscriptionId) {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement(
                "SELECT * FROM " + t("pending") + " WHERE subscription_id = ? ORDER BY seq")) {
            stmt.setString(1, subscriptionId);
            try (var rs = stmt.executeQuery()) {
                while (rs.next()) result.add(rowToPendingMap(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("getPendingForSubscription failed", e);
        }
        return result;
    }

    public boolean isAcknowledged(String eventId) {
        return exists(t("acked"), eventId);
    }

    public boolean isPending(String eventId) {
        return exists(t("pending"), eventId);
    }

    public boolean hasAttemptsRemaining(String eventId, int maxAttempts) {
        try (var stmt = conn.prepareStatement(
                "SELECT attempts FROM " + t("pending") + " WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next() && rs.getInt("attempts") < maxAttempts;
            }
        } catch (SQLException e) {
            throw new RuntimeException("hasAttemptsRemaining failed", e);
        }
    }

    public Map<String, Object> getStats() {
        var pending = count(t("pending"));
        var acked = count(t("acked"));
        var dlq = count(t("dead_lettered"));
        var stats = new LinkedHashMap<String, Object>();
        stats.put("totalSequences", sequence);
        stats.put("pending", pending);
        stats.put("acknowledged", acked);
        stats.put("deadLettered", dlq);
        stats.put("lastAckCursor", lastAckCursor);
        return stats;
    }

    public void close() throws SQLException {
        if (dropOnClose) {
            try (var stmt = conn.createStatement()) {
                stmt.execute("DROP TABLE IF EXISTS " + t("meta") + ", " + t("pending") + ", "
                    + t("acked") + ", " + t("dead_lettered"));
            }
        }
        conn.close();
    }

    private boolean exists(String table, String eventId) {
        try (var stmt = conn.prepareStatement("SELECT 1 FROM " + table + " WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            throw new RuntimeException("exists failed", e);
        }
    }

    private int count(String table) {
        try (var stmt = conn.prepareStatement("SELECT COUNT(*) FROM " + table);
             var rs = stmt.executeQuery()) {
            return rs.next() ? rs.getInt(1) : 0;
        } catch (SQLException e) {
            throw new RuntimeException("count failed", e);
        }
    }

    private Map<String, String> getPendingEntry(String eventId) {
        try (var stmt = conn.prepareStatement("SELECT * FROM " + t("pending") + " WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                if (!rs.next()) return null;
                var map = new LinkedHashMap<String, String>();
                map.put("cursor", rs.getString("cursor"));
                map.put("subscription_id", rs.getString("subscription_id"));
                map.put("seq", String.valueOf(rs.getLong("seq")));
                map.put("attempts", String.valueOf(rs.getInt("attempts")));
                map.put("last_attempt_at", rs.getString("last_attempt_at"));
                return map;
            }
        } catch (SQLException e) {
            throw new RuntimeException("getPendingEntry failed", e);
        }
    }

    private Map<String, Object> rowToPendingMap(ResultSet rs) throws SQLException {
        var map = new LinkedHashMap<String, Object>();
        map.put("eventId", rs.getString("event_id"));
        map.put("subscriptionId", rs.getString("subscription_id"));
        map.put("sequence", (int) rs.getLong("seq"));
        map.put("cursor", rs.getString("cursor"));
        map.put("attempts", rs.getInt("attempts"));
        map.put("firstAttemptAt", rs.getString("first_attempt_at"));
        map.put("lastAttemptAt", rs.getString("last_attempt_at"));
        return map;
    }
}
```

Note: `DeliveryStore` is package-private but `PostgresDeliveryStore` is in the same package `com.axisrobo.aep`, so it can implement the interface.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd reference/java && mvn test -Dtest=PostgresDeliveryStoreTest`
Expected: `Tests run: 6, Failures: 0, Errors: 0`.

- [ ] **Step 6: Run the full Java suite**

Run: `cd reference/java && mvn test`
Expected: BUILD SUCCESS, all tests pass (previous 86 + 6 new = 92).

- [ ] **Step 7: Commit**

```bash
git add reference/java/pom.xml "reference/java/src/main/java/com/axisrobo/aep/PostgresDeliveryStore.java" "reference/java/src/test/java/com/axisrobo/aep/PostgresDeliveryStoreTest.java"
git commit -m "feat: add Java PostgresDeliveryStore backend"
```

---

## Task 5: Documentation

**Files:**
- Modify: `docs/specs/reliability.md` (note the Postgres backend)
- Modify: `docs/roadmap.md` (record production delivery-store progress)

- [ ] **Step 1: Update reliability.md durability section**

In `docs/specs/reliability.md`, find the durability guidance that says production deployments should persist events in a durable store, and append a sentence after it:

```markdown
Reference implementations ship three delivery-store backends per language: an in-memory store, an embedded SQLite store, and a networked `PostgresDeliveryStore` for shared, multi-process production deployments.
```

- [ ] **Step 2: Update roadmap.md future-work line**

In `docs/roadmap.md`, replace the line:

```markdown
Future roadmap work should focus on: production delivery-store backends, formal protocol versioning, and community governance structures.
```

with:

```markdown
Future roadmap work should focus on: formal protocol versioning and community governance structures. A networked PostgreSQL delivery-store backend now ships in all four languages alongside the in-memory and SQLite backends.
```

- [ ] **Step 3: Commit**

```bash
git add docs/specs/reliability.md docs/roadmap.md
git commit -m "docs: record PostgreSQL delivery-store backend across languages"
```

---

## Final Verification

- [ ] **Run all four suites against the live Postgres:**

```bash
cd reference/go && go test ./...
cd reference/python && python -m pytest
cd reference/typescript && npm test
cd reference/java && mvn test
```

Expected: all four green. Go `ok`, Python 134 passed, TypeScript 139 pass, Java 92 tests.

- [ ] **Push (only if the user asks):**

```bash
git push origin master
```
