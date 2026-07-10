# TS + Python SQLite Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SQLite-backed delivery stores to TypeScript and Python, matching the Java SqliteDeliveryStore contract and table schema.

**Architecture:** Same 4-table schema (delivery_pending, delivery_acked, delivery_dead_lettered, delivery_meta) across all languages. TypeScript uses `better-sqlite3`, Python uses stdlib `sqlite3`. Both use `:memory:` for tests.

**Tech Stack:** Node ESM + `better-sqlite3`, Python 3.12 + `sqlite3` (stdlib).

---

## File Structure

- Modify: `reference/typescript/package.json` — add better-sqlite3
- Create: `reference/typescript/src/delivery-store-sqlite.js`
- Create: `reference/typescript/test/delivery-store-sqlite.test.js`
- Create: `reference/python/src/aep/sqlite_delivery_store.py`
- Create: `reference/python/tests/test_sqlite_delivery_store.py`

---

### Task 1: TypeScript SqliteDeliveryStore

**Files:**
- Modify: `reference/typescript/package.json`
- Create: `reference/typescript/src/delivery-store-sqlite.js`
- Create: `reference/typescript/test/delivery-store-sqlite.test.js`

- [ ] **Step 1: Add better-sqlite3 dependency + write failing test**

In `reference/typescript/package.json`, add to dependencies:
```json
"better-sqlite3": "^11.0.0"
```

Create `reference/typescript/test/delivery-store-sqlite.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { SqliteDeliveryStore } from "../src/delivery-store-sqlite.js";
import { DeliveryTracker } from "../src/delivery.js";
import { DeliveryJournal } from "../src/delivery-journal.js";

test("SqliteDeliveryStore tracks and acknowledges events", () => {
  const store = new SqliteDeliveryStore(":memory:");
  const seq = store.track("evt_001", "sub_01");
  assert.equal(seq, 1);
  assert.equal(store.isPending("evt_001"), true);
  assert.equal(store.isAcknowledged("evt_001"), false);
  assert.equal(store.ack("evt_001"), true);
  assert.equal(store.isAcknowledged("evt_001"), true);
  assert.equal(store.isPending("evt_001"), false);
  store.close();
});

test("SqliteDeliveryStore nacks and increments attempts", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_001", "sub_01");
  const attempts = store.nack("evt_001");
  assert.equal(attempts, 2);
  const pending = store.getPending();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].attempts, 2);
  store.close();
});

test("SqliteDeliveryStore dead-letters events", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_001", "sub_01");
  const dlq = store.deadLetter("evt_001", { error: { code: "timeout" } });
  assert.ok(dlq);
  assert.equal(dlq.type, "event.dead_lettered");
  assert.equal(store.isPending("evt_001"), false);
  store.close();
});

test("SqliteDeliveryStore works with DeliveryTracker", () => {
  const store = new SqliteDeliveryStore(":memory:");
  const journal = new DeliveryJournal();
  const tracker = new DeliveryTracker({ store, journal });
  tracker.track("evt_001");
  assert.equal(tracker.isPending("evt_001"), true);
  tracker.ack("evt_001");
  assert.equal(tracker.isAcknowledged("evt_001"), true);
  store.close();
});

test("SqliteDeliveryStore provides stats", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_a", "sub_01");
  store.track("evt_b", "sub_01");
  store.ack("evt_a");
  store.track("evt_c", "sub_02");
  store.deadLetter("evt_c");
  const stats = store.getStats();
  assert.equal(stats.totalSequences, 3);
  assert.equal(stats.pending, 1);
  assert.equal(stats.acknowledged, 1);
  assert.equal(stats.deadLettered, 1);
  store.close();
});

test("SqliteDeliveryStore getPendingForSubscription filters", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_a", "sub_01");
  store.track("evt_b", "sub_02");
  store.track("evt_c", "sub_01");
  const filtered = store.getPendingForSubscription("sub_01");
  assert.equal(filtered.length, 2);
  store.close();
});

test("SqliteDeliveryStore hasAttemptsRemaining checks max", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_001", "sub_01");
  assert.equal(store.hasAttemptsRemaining("evt_001", 3), true);
  store.nack("evt_001");
  store.nack("evt_001");
  assert.equal(store.hasAttemptsRemaining("evt_001", 3), false);
  store.close();
});
```

- [ ] **Step 2: Install dep and run test to verify failure**

```bash
cd reference/typescript && npm install
npm test -- test/delivery-store-sqlite.test.js
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement SqliteDeliveryStore**

Create `reference/typescript/src/delivery-store-sqlite.js`:

```js
import Database from "better-sqlite3";

export class SqliteDeliveryStore {
  constructor(url, streamId = "stream_01") {
    this._db = new Database(url);
    this._streamId = streamId;
    this._sequence = 0;
    this._db.pragma("journal_mode = WAL");
    this._initSchema();
  }

  _initSchema() {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS delivery_pending (
        event_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        cursor TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 1,
        first_attempt_at TEXT NOT NULL,
        last_attempt_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS delivery_acked (
        event_id TEXT PRIMARY KEY,
        cursor TEXT NOT NULL,
        acked_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS delivery_dead_lettered (
        event_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        cursor TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        last_attempt_at TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '{}',
        dead_lettered_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS delivery_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  nextSequence() {
    return ++this._sequence;
  }

  track(eventId, subscriptionId = "_default") {
    const seq = this.nextSequence();
    const now = new Date().toISOString();
    const cursor = `${this._streamId}:${seq}`;
    this._db.prepare(
      "INSERT INTO delivery_pending (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at) VALUES (?,?,?,?,1,?,?)"
    ).run(eventId, subscriptionId, seq, cursor, now, now);
    return seq;
  }

  ack(eventId) {
    const entry = this._db.prepare("SELECT * FROM delivery_pending WHERE event_id = ?").get(eventId);
    if (!entry) return false;
    this._db.prepare("DELETE FROM delivery_pending WHERE event_id = ?").run(eventId);
    this._db.prepare("INSERT INTO delivery_acked (event_id, cursor, acked_at) VALUES (?,?,?)")
      .run(eventId, entry.cursor, new Date().toISOString());
    this._db.prepare("INSERT OR REPLACE INTO delivery_meta (key, value) VALUES ('last_ack_cursor', ?)")
      .run(entry.cursor);
    return true;
  }

  nack(eventId) {
    const entry = this._db.prepare("SELECT * FROM delivery_pending WHERE event_id = ?").get(eventId);
    if (!entry) return false;
    const attempts = entry.attempts + 1;
    this._db.prepare("UPDATE delivery_pending SET attempts = ?, last_attempt_at = ? WHERE event_id = ?")
      .run(attempts, new Date().toISOString(), eventId);
    return attempts;
  }

  deadLetter(eventId, reason = {}) {
    const entry = this._db.prepare("SELECT * FROM delivery_pending WHERE event_id = ?").get(eventId);
    if (!entry) return null;
    this._db.prepare("DELETE FROM delivery_pending WHERE event_id = ?").run(eventId);
    this._db.prepare(
      "INSERT INTO delivery_dead_lettered (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at) VALUES (?,?,?,?,?,?,?,?)"
    ).run(eventId, entry.subscription_id, entry.seq, entry.cursor, entry.attempts, entry.last_attempt_at,
      JSON.stringify(reason), new Date().toISOString());
    return {
      type: "event.dead_lettered",
      payload: {
        original_event_id: eventId,
        subscription_id: entry.subscription_id,
        cursor: entry.cursor,
        attempts: entry.attempts,
        last_attempt_at: entry.last_attempt_at,
        error: reason.error ?? null
      }
    };
  }

  getPending() {
    return this._db.prepare("SELECT * FROM delivery_pending ORDER BY seq").all().map(rowToPending);
  }

  getPendingForSubscription(subscriptionId) {
    return this._db.prepare("SELECT * FROM delivery_pending WHERE subscription_id = ? ORDER BY seq")
      .all(subscriptionId).map(rowToPending);
  }

  isAcknowledged(eventId) {
    return !!this._db.prepare("SELECT 1 FROM delivery_acked WHERE event_id = ?").get(eventId);
  }

  isPending(eventId) {
    return !!this._db.prepare("SELECT 1 FROM delivery_pending WHERE event_id = ?").get(eventId);
  }

  hasAttemptsRemaining(eventId, maxAttempts) {
    const entry = this._db.prepare("SELECT attempts FROM delivery_pending WHERE event_id = ?").get(eventId);
    return entry ? entry.attempts < maxAttempts : false;
  }

  getStats() {
    const pending = this._db.prepare("SELECT COUNT(*) as c FROM delivery_pending").get().c;
    const acked = this._db.prepare("SELECT COUNT(*) as c FROM delivery_acked").get().c;
    const dlq = this._db.prepare("SELECT COUNT(*) as c FROM delivery_dead_lettered").get().c;
    const meta = this._db.prepare("SELECT value FROM delivery_meta WHERE key = 'last_ack_cursor'").get();
    return {
      totalSequences: this._sequence,
      pending,
      acknowledged: acked,
      deadLettered: dlq,
      lastAckCursor: meta?.value ?? null
    };
  }

  close() {
    this._db.close();
  }
}

function rowToPending(row) {
  return {
    eventId: row.event_id,
    subscriptionId: row.subscription_id,
    sequence: row.seq,
    cursor: row.cursor,
    attempts: row.attempts,
    firstAttemptAt: row.first_attempt_at,
    lastAttemptAt: row.last_attempt_at
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd reference/typescript && npm test -- test/delivery-store-sqlite.test.js
```

Expected: 7 tests pass.

- [ ] **Step 5: Run all TS tests**

```bash
cd reference/typescript && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add reference/typescript/package.json reference/typescript/src/delivery-store-sqlite.js reference/typescript/test/delivery-store-sqlite.test.js
git commit -m "feat: add TypeScript SqliteDeliveryStore with tests"
```

---

### Task 2: Python SqliteDeliveryStore

**Files:**
- Create: `reference/python/src/aep/sqlite_delivery_store.py`
- Create: `reference/python/tests/test_sqlite_delivery_store.py`

- [ ] **Step 1: Write failing test**

Create `reference/python/tests/test_sqlite_delivery_store.py`:

```python
import pytest
from aep.sqlite_delivery_store import SqliteDeliveryStore
from aep.delivery import DeliveryTracker
from aep.delivery_journal import DeliveryJournal


@pytest.fixture
def store():
    s = SqliteDeliveryStore(":memory:")
    yield s
    s.close()


def test_tracks_and_acknowledges_events(store):
    seq = store.track("evt_001", "sub_01")
    assert seq == 1
    assert store.is_pending("evt_001") is True
    assert store.is_acknowledged("evt_001") is False
    assert store.ack("evt_001") is True
    assert store.is_acknowledged("evt_001") is True
    assert store.is_pending("evt_001") is False


def test_nacks_and_increments_attempts(store):
    store.track("evt_001", "sub_01")
    attempts = store.nack("evt_001")
    assert attempts == 2
    pending = store.get_pending()
    assert len(pending) == 1
    assert pending[0]["attempts"] == 2


def test_dead_letters_events(store):
    store.track("evt_001", "sub_01")
    dlq = store.dead_letter("evt_001", {"error": {"code": "timeout"}})
    assert dlq is not None
    assert dlq["type"] == "event.dead_lettered"
    assert store.is_pending("evt_001") is False


def test_works_with_delivery_tracker(store):
    journal = DeliveryJournal()
    tracker = DeliveryTracker(store=store, journal=journal)
    tracker.track("evt_001")
    assert tracker.is_pending("evt_001") is True
    tracker.ack("evt_001")
    assert tracker.is_acknowledged("evt_001") is True


def test_provides_stats(store):
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


def test_get_pending_for_subscription_filters(store):
    store.track("evt_a", "sub_01")
    store.track("evt_b", "sub_02")
    store.track("evt_c", "sub_01")
    filtered = store.get_pending_for_subscription("sub_01")
    assert len(filtered) == 2


def test_has_attempts_remaining_checks_max(store):
    store.track("evt_001", "sub_01")
    assert store.has_attempts_remaining("evt_001", 3) is True
    store.nack("evt_001")
    store.nack("evt_001")
    assert store.has_attempts_remaining("evt_001", 3) is False
```

- [ ] **Step 2: Run to verify failure**

```bash
cd reference/python && python -m pytest tests/test_sqlite_delivery_store.py -q
```

Expected: FAIL with ModuleNotFoundError.

- [ ] **Step 3: Implement**

Create `reference/python/src/aep/sqlite_delivery_store.py`:

```python
import sqlite3
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class SqliteDeliveryStore:
    def __init__(self, url: str, stream_id: str = "stream_01"):
        self._db = sqlite3.connect(url, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._stream_id = stream_id
        self._sequence = 0
        self._init_schema()

    def _init_schema(self):
        self._db.executescript("""
            CREATE TABLE IF NOT EXISTS delivery_pending (
                event_id TEXT PRIMARY KEY,
                subscription_id TEXT NOT NULL,
                seq INTEGER NOT NULL,
                cursor TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 1,
                first_attempt_at TEXT NOT NULL,
                last_attempt_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS delivery_acked (
                event_id TEXT PRIMARY KEY,
                cursor TEXT NOT NULL,
                acked_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS delivery_dead_lettered (
                event_id TEXT PRIMARY KEY,
                subscription_id TEXT NOT NULL,
                seq INTEGER NOT NULL,
                cursor TEXT NOT NULL,
                attempts INTEGER NOT NULL,
                last_attempt_at TEXT NOT NULL,
                reason TEXT NOT NULL DEFAULT '{}',
                dead_lettered_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS delivery_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)

    def next_sequence(self) -> int:
        self._sequence += 1
        return self._sequence

    def track(self, event_id: str, subscription_id: str = "_default") -> int:
        seq = self.next_sequence()
        now = _now()
        cursor = f"{self._stream_id}:{seq}"
        self._db.execute(
            "INSERT INTO delivery_pending (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at) VALUES (?,?,?,?,1,?,?)",
            (event_id, subscription_id, seq, cursor, now, now),
        )
        self._db.commit()
        return seq

    def ack(self, event_id: str) -> bool:
        row = self._db.execute("SELECT * FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone()
        if row is None:
            return False
        self._db.execute("DELETE FROM delivery_pending WHERE event_id = ?", (event_id,))
        self._db.execute("INSERT INTO delivery_acked (event_id, cursor, acked_at) VALUES (?,?,?)",
                         (event_id, row["cursor"], _now()))
        self._db.execute("INSERT OR REPLACE INTO delivery_meta (key, value) VALUES ('last_ack_cursor', ?)",
                         (row["cursor"],))
        self._db.commit()
        return True

    def nack(self, event_id: str) -> int | bool:
        row = self._db.execute("SELECT * FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone()
        if row is None:
            return False
        attempts = row["attempts"] + 1
        self._db.execute("UPDATE delivery_pending SET attempts = ?, last_attempt_at = ? WHERE event_id = ?",
                         (attempts, _now(), event_id))
        self._db.commit()
        return attempts

    def dead_letter(self, event_id: str, reason: dict | None = None) -> dict | None:
        row = self._db.execute("SELECT * FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone()
        if row is None:
            return None
        if reason is None:
            reason = {}
        self._db.execute("DELETE FROM delivery_pending WHERE event_id = ?", (event_id,))
        self._db.execute(
            "INSERT INTO delivery_dead_lettered (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at) VALUES (?,?,?,?,?,?,?,?)",
            (event_id, row["subscription_id"], row["seq"], row["cursor"], row["attempts"],
             row["last_attempt_at"], str(reason), _now()),
        )
        self._db.commit()
        return {
            "type": "event.dead_lettered",
            "payload": {
                "original_event_id": event_id,
                "subscription_id": row["subscription_id"],
                "cursor": row["cursor"],
                "attempts": row["attempts"],
                "last_attempt_at": row["last_attempt_at"],
                "error": reason.get("error"),
            },
        }

    def get_pending(self) -> list[dict]:
        rows = self._db.execute("SELECT * FROM delivery_pending ORDER BY seq").fetchall()
        return [self._row_to_pending(r) for r in rows]

    def get_pending_for_subscription(self, subscription_id: str) -> list[dict]:
        rows = self._db.execute(
            "SELECT * FROM delivery_pending WHERE subscription_id = ? ORDER BY seq", (subscription_id,)
        ).fetchall()
        return [self._row_to_pending(r) for r in rows]

    def is_acknowledged(self, event_id: str) -> bool:
        return self._db.execute("SELECT 1 FROM delivery_acked WHERE event_id = ?", (event_id,)).fetchone() is not None

    def is_pending(self, event_id: str) -> bool:
        return self._db.execute("SELECT 1 FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone() is not None

    def has_attempts_remaining(self, event_id: str, max_attempts: int) -> bool:
        row = self._db.execute("SELECT attempts FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone()
        if row is None:
            return False
        return row["attempts"] < max_attempts

    def get_stats(self) -> dict:
        pending = self._db.execute("SELECT COUNT(*) as c FROM delivery_pending").fetchone()["c"]
        acked = self._db.execute("SELECT COUNT(*) as c FROM delivery_acked").fetchone()["c"]
        dlq = self._db.execute("SELECT COUNT(*) as c FROM delivery_dead_lettered").fetchone()["c"]
        meta = self._db.execute("SELECT value FROM delivery_meta WHERE key = 'last_ack_cursor'").fetchone()
        return {
            "totalSequences": self._sequence,
            "pending": pending,
            "acknowledged": acked,
            "deadLettered": dlq,
            "lastAckCursor": meta["value"] if meta else None,
        }

    def close(self):
        self._db.close()

    @staticmethod
    def _row_to_pending(row) -> dict:
        return {
            "eventId": row["event_id"],
            "subscriptionId": row["subscription_id"],
            "sequence": row["seq"],
            "cursor": row["cursor"],
            "attempts": row["attempts"],
            "firstAttemptAt": row["first_attempt_at"],
            "lastAttemptAt": row["last_attempt_at"],
        }
```

- [ ] **Step 4: Run tests**

```bash
cd reference/python && python -m pytest tests/test_sqlite_delivery_store.py -q
```

Expected: 7 passed.

- [ ] **Step 5: Run all Python tests**

```bash
cd reference/python && python -m pytest --tb=short -q
```

Expected: all pass (71 + 7 = 78).

- [ ] **Step 6: Commit**

```bash
git add reference/python/src/aep/sqlite_delivery_store.py reference/python/tests/test_sqlite_delivery_store.py
git commit -m "feat: add Python SqliteDeliveryStore with tests"
```

---

### Task 3: Documentation, Verification, And Push

- [ ] **Step 1: Update TypeScript README scope**

In `reference/typescript/README.md`, modify the delivery line to:
```markdown
- Delivery tracking with ack/retry/dead-letter helpers, pluggable store (InMemory + SQLite), and event journal
```

- [ ] **Step 2: Update Python package exports**

In `reference/python/src/aep/__init__.py`, add:
```python
from .sqlite_delivery_store import SqliteDeliveryStore
```
And add `"SqliteDeliveryStore"` to `__all__`.

- [ ] **Step 3: Full cross-language verification**

```bash
cd reference/typescript && npm test && npm run conformance
cd reference/python && python -m pytest --tb=short -q
cd reference/java && mvn test -q
cd reference/go && go test ./aep/ -v
```

- [ ] **Step 4: Commit and push**

```bash
git add reference/typescript/README.md reference/python/src/aep/__init__.py
git commit -m "docs: update scope for SQLite stores"
git status --short
git push
```
