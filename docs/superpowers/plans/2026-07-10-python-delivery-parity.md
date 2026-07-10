# Python Delivery Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the TypeScript delivery subsystem (InMemoryDeliveryStore, DeliveryJournal, DeliveryTracker) to Python with identical behavior and test coverage.

**Architecture:** Three new Python modules under `reference/python/src/aep/` mirror the TypeScript implementations. `DeliveryTracker` delegates to pluggable store and journal with backward-compatible defaults. No new dependencies.

**Tech Stack:** Python 3.12, pytest, `datetime`, `math`. Zero external dependencies beyond what's already in `pyproject.toml`.

---

## File Structure

- Create: `reference/python/src/aep/delivery_store.py` — InMemoryDeliveryStore with dict/set-based storage.
- Create: `reference/python/src/aep/delivery_journal.py` — DeliveryJournal for sequence-ordered replay.
- Create: `reference/python/src/aep/delivery.py` — DeliveryTracker delegating to store/journal, plus retry_delay.
- Create: `reference/python/tests/test_delivery_store.py` — 8 unit tests.
- Create: `reference/python/tests/test_delivery_journal.py` — 6 unit tests.
- Create: `reference/python/tests/test_delivery.py` — delivery tracker tests + store injection test.
- Modify: `reference/python/src/aep/__init__.py` — export new modules.

---

### Task 1: InMemoryDeliveryStore

**Files:**
- Create: `reference/python/src/aep/delivery_store.py`
- Create: `reference/python/tests/test_delivery_store.py`

- [ ] **Step 1: Write failing store tests**

Create `reference/python/tests/test_delivery_store.py`:

```python
from aep.delivery_store import InMemoryDeliveryStore


def test_tracks_and_acknowledges_events():
    store = InMemoryDeliveryStore()
    seq = store.track("evt_001", "sub_01")
    assert seq == 1
    assert store.is_pending("evt_001") is True
    assert store.is_acknowledged("evt_001") is False
    acked = store.ack("evt_001")
    assert acked is True
    assert store.is_acknowledged("evt_001") is True
    assert store.is_pending("evt_001") is False


def test_nacks_and_increments_attempts():
    store = InMemoryDeliveryStore()
    store.track("evt_001", "sub_01")
    attempts = store.nack("evt_001")
    assert attempts == 2
    pending = store.get_pending()
    assert len(pending) == 1
    assert pending[0]["attempts"] == 2


def test_dead_letters_exhausted_events():
    store = InMemoryDeliveryStore()
    store.track("evt_001", "sub_01")
    dlq = store.dead_letter("evt_001", {"error": {"code": "timeout", "message": "no ack"}})
    assert dlq is not None
    assert dlq["payload"]["attempts"] == 1
    assert dlq["payload"]["original_event_id"] == "evt_001"
    assert store.is_pending("evt_001") is False


def test_provides_stats():
    store = InMemoryDeliveryStore()
    store.track("evt_a", "sub_01")
    store.track("evt_b", "sub_01")
    store.ack("evt_a")
    store.track("evt_c", "sub_02")
    store.dead_letter("evt_c", {})
    stats = store.get_stats()
    assert stats["totalSequences"] == 3
    assert stats["pending"] == 1
    assert stats["acknowledged"] == 1
    assert stats["deadLettered"] == 1


def test_nack_returns_false_for_unknown_events():
    store = InMemoryDeliveryStore()
    assert store.nack("nonexistent") is False


def test_dead_letter_returns_none_for_unknown_events():
    store = InMemoryDeliveryStore()
    assert store.dead_letter("nonexistent") is None


def test_has_attempts_remaining_checks_max():
    store = InMemoryDeliveryStore()
    store.track("evt_001", "sub_01")
    assert store.has_attempts_remaining("evt_001", 3) is True
    store.nack("evt_001")
    store.nack("evt_001")
    assert store.has_attempts_remaining("evt_001", 3) is False


def test_get_pending_for_subscription_filters():
    store = InMemoryDeliveryStore()
    store.track("evt_a", "sub_01")
    store.track("evt_b", "sub_02")
    store.track("evt_c", "sub_01")
    filtered = store.get_pending_for_subscription("sub_01")
    assert len(filtered) == 2
    assert [e["eventId"] for e in filtered] == ["evt_a", "evt_c"]
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd reference/python
python -m pytest tests/test_delivery_store.py -q
```

Expected: FAIL with `ModuleNotFoundError: No module named 'aep.delivery_store'`.

- [ ] **Step 3: Implement InMemoryDeliveryStore**

Create `reference/python/src/aep/delivery_store.py`:

```python
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class InMemoryDeliveryStore:
    def __init__(self, start_sequence: int = 0, stream_id: str = "stream_01"):
        self._sequence = start_sequence
        self._stream_id = stream_id
        self._pending: dict[str, dict] = {}
        self._acked: set[str] = set()
        self._dead_lettered: dict[str, dict] = {}
        self._last_ack_cursor: str | None = None

    def next_sequence(self) -> int:
        self._sequence += 1
        return self._sequence

    def track(self, event_id: str, subscription_id: str = "_default") -> int:
        seq = self.next_sequence()
        self._pending[event_id] = {
            "eventId": event_id,
            "subscriptionId": subscription_id,
            "sequence": seq,
            "cursor": f"{self._stream_id}:{seq}",
            "attempts": 1,
            "firstAttemptAt": _now(),
            "lastAttemptAt": _now(),
            "nextRetryAt": None,
        }
        return seq

    def ack(self, event_id: str) -> bool:
        entry = self._pending.pop(event_id, None)
        if entry is None:
            return False
        self._acked.add(event_id)
        self._last_ack_cursor = entry["cursor"]
        return True

    def nack(self, event_id: str) -> int | bool:
        entry = self._pending.get(event_id)
        if entry is None:
            return False
        entry["attempts"] += 1
        entry["lastAttemptAt"] = _now()
        return entry["attempts"]

    def dead_letter(self, event_id: str, reason: dict | None = None) -> dict | None:
        entry = self._pending.pop(event_id, None)
        if entry is None:
            return None
        if reason is None:
            reason = {}
        record = {**entry, "deadLetteredAt": _now(), "reason": reason}
        self._dead_lettered[event_id] = record
        return {
            "type": "event.dead_lettered",
            "payload": {
                "original_event_id": event_id,
                "subscription_id": entry["subscriptionId"],
                "cursor": entry["cursor"],
                "attempts": entry["attempts"],
                "last_attempt_at": entry["lastAttemptAt"],
                "error": reason.get("error"),
            },
        }

    def get_pending(self) -> list[dict]:
        return list(self._pending.values())

    def get_pending_for_subscription(self, subscription_id: str) -> list[dict]:
        return [e for e in self._pending.values() if e["subscriptionId"] == subscription_id]

    def is_acknowledged(self, event_id: str) -> bool:
        return event_id in self._acked

    def is_pending(self, event_id: str) -> bool:
        return event_id in self._pending

    def has_attempts_remaining(self, event_id: str, max_attempts: int) -> bool:
        entry = self._pending.get(event_id)
        if entry is None:
            return False
        return entry["attempts"] < max_attempts

    def get_stats(self) -> dict:
        return {
            "totalSequences": self._sequence,
            "pending": len(self._pending),
            "acknowledged": len(self._acked),
            "deadLettered": len(self._dead_lettered),
            "lastAckCursor": self._last_ack_cursor,
        }
```

- [ ] **Step 4: Run store tests**

```bash
cd reference/python
python -m pytest tests/test_delivery_store.py -q
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add reference/python/src/aep/delivery_store.py reference/python/tests/test_delivery_store.py
git commit -m "feat: add Python InMemoryDeliveryStore with tests"
```

Expected: commit succeeds.

---

### Task 2: DeliveryJournal

**Files:**
- Create: `reference/python/src/aep/delivery_journal.py`
- Create: `reference/python/tests/test_delivery_journal.py`

- [ ] **Step 1: Write failing journal tests**

Create `reference/python/tests/test_delivery_journal.py`:

```python
from aep.delivery_journal import DeliveryJournal


def test_appends_events_with_sequence():
    journal = DeliveryJournal()
    seq1 = journal.append({"type": "task.submitted", "task_id": "task_01"})
    seq2 = journal.append({"type": "task.completed", "task_id": "task_01"})
    assert seq1 == 1
    assert seq2 == 2


def test_replays_events_since_cursor():
    journal = DeliveryJournal()
    journal.append({"type": "task.submitted"})
    journal.append({"type": "task.started"})
    journal.append({"type": "task.completed"})
    events = journal.replay("stream_01:1")
    assert len(events) == 2
    assert events[0]["type"] == "task.started"
    assert events[1]["type"] == "task.completed"


def test_replays_all_events_with_default_cursor():
    journal = DeliveryJournal()
    journal.append({"type": "task.submitted"})
    journal.append({"type": "task.started"})
    events = journal.replay()
    assert len(events) == 2


def test_purges_events_before_cursor():
    journal = DeliveryJournal()
    journal.append({"type": "evt_1"})
    journal.append({"type": "evt_2"})
    journal.append({"type": "evt_3"})
    removed = journal.purge("stream_01:2")
    assert removed == 2
    events = journal.replay()
    assert len(events) == 1
    assert events[0]["type"] == "evt_3"


def test_provides_stats():
    journal = DeliveryJournal()
    journal.append({"type": "evt_1"})
    journal.append({"type": "evt_2"})
    stats = journal.get_stats()
    assert stats["totalEvents"] == 2
    assert stats["oldestSequence"] == 1
    assert stats["newestSequence"] == 2


def test_stats_are_empty_for_new_journal():
    journal = DeliveryJournal()
    stats = journal.get_stats()
    assert stats["totalEvents"] == 0
    assert stats["oldestSequence"] is None
    assert stats["newestSequence"] is None
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd reference/python
python -m pytest tests/test_delivery_journal.py -q
```

Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Implement DeliveryJournal**

Create `reference/python/src/aep/delivery_journal.py`:

```python
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class DeliveryJournal:
    def __init__(self, stream_id: str = "stream_01"):
        self._stream_id = stream_id
        self._events: list[dict] = []
        self._sequence = 0

    def next_sequence(self) -> int:
        self._sequence += 1
        return self._sequence

    def append(self, event: dict) -> int:
        seq = self.next_sequence()
        record = {
            **event,
            "_journal_sequence": seq,
            "_journal_cursor": f"{self._stream_id}:{seq}",
            "_journal_appendedAt": _now(),
        }
        self._events.append(record)
        return seq

    def replay(self, cursor: str | None = None) -> list[dict]:
        if cursor is None:
            return list(self._events)
        parts = cursor.split(":")
        since_seq = int(parts[1]) if len(parts) > 1 else 0
        return [e for e in self._events if e["_journal_sequence"] > since_seq]

    def replay_since_sequence(self, seq: int) -> list[dict]:
        return [e for e in self._events if e["_journal_sequence"] > seq]

    def purge(self, cursor: str) -> int:
        parts = cursor.split(":")
        before_seq = int(parts[1]) if len(parts) > 1 else 0
        removed = 0
        while self._events and self._events[0]["_journal_sequence"] <= before_seq:
            self._events.pop(0)
            removed += 1
        return removed

    def get_stats(self) -> dict:
        return {
            "totalEvents": len(self._events),
            "oldestSequence": self._events[0]["_journal_sequence"] if self._events else None,
            "newestSequence": self._events[-1]["_journal_sequence"] if self._events else None,
        }
```

- [ ] **Step 4: Run journal tests**

```bash
cd reference/python
python -m pytest tests/test_delivery_journal.py -q
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add reference/python/src/aep/delivery_journal.py reference/python/tests/test_delivery_journal.py
git commit -m "feat: add Python DeliveryJournal with tests"
```

Expected: commit succeeds.

---

### Task 3: DeliveryTracker

**Files:**
- Create: `reference/python/src/aep/delivery.py`
- Create: `reference/python/tests/test_delivery.py`

- [ ] **Step 1: Write failing delivery tracker tests**

Create `reference/python/tests/test_delivery.py`:

```python
from aep.delivery import DeliveryTracker, retry_delay, DEFAULT_RETRY
from aep.delivery_store import InMemoryDeliveryStore
from aep.delivery_journal import DeliveryJournal


def test_retry_delay_computes_exponential_backoff():
    delay = retry_delay(1)
    assert delay == 1000
    delay = retry_delay(2)
    assert delay == 2000
    delay = retry_delay(3)
    assert delay == 4000


def test_retry_delay_respects_max_backoff():
    delay = retry_delay(10)
    assert delay == DEFAULT_RETRY["max_backoff_ms"]


def test_tracker_assigns_monotonically_increasing_sequences():
    tracker = DeliveryTracker()
    seq1 = tracker.track("evt_001")
    seq2 = tracker.track("evt_002")
    assert seq1 == 1
    assert seq2 == 2


def test_tracker_acknowledges_events():
    tracker = DeliveryTracker()
    tracker.track("evt_001")
    result = tracker.ack("evt_001")
    assert result is True
    assert tracker.is_acknowledged("evt_001") is True
    assert tracker.is_pending("evt_001") is False


def test_tracker_nacks_and_retries():
    tracker = DeliveryTracker()
    tracker.track("evt_001")
    attempts = tracker.nack("evt_001")
    assert attempts == 2


def test_tracker_dead_letters_exhausted_events():
    tracker = DeliveryTracker()
    tracker.track("evt_001")
    dlq = tracker.dead_letter("evt_001")
    assert dlq is not None
    assert dlq["type"] == "event.dead_lettered"


def test_tracker_get_pending_for_subscription_filters():
    tracker = DeliveryTracker()
    tracker.track("evt_a", "sub_01")
    tracker.track("evt_b", "sub_02")
    filtered = tracker.get_pending_for_subscription("sub_01")
    assert len(filtered) == 1
    assert filtered[0]["eventId"] == "evt_a"


def test_tracker_stats_reports_comprehensive_state():
    tracker = DeliveryTracker()
    tracker.track("evt_a")
    tracker.track("evt_b")
    tracker.ack("evt_a")
    stats = tracker.stats
    assert stats["totalSequences"] == 2
    assert stats["pending"] == 1
    assert stats["acknowledged"] == 1


def test_tracker_uses_provided_store_and_journal():
    store = InMemoryDeliveryStore()
    journal = DeliveryJournal()
    tracker = DeliveryTracker(store=store, journal=journal)
    seq = tracker.track("evt_store_001")
    assert seq == 1
    assert store.is_pending("evt_store_001") is True
    tracker.ack("evt_store_001")
    assert store.is_acknowledged("evt_store_001") is True
    journal.append({"type": "task.submitted"})
    assert journal.get_stats()["totalEvents"] == 1
    stats = tracker.stats
    assert stats["pending"] == 0
    assert stats["acknowledged"] == 1
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd reference/python
python -m pytest tests/test_delivery.py -q
```

Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Implement DeliveryTracker**

Create `reference/python/src/aep/delivery.py`:

```python
from .delivery_store import InMemoryDeliveryStore
from .delivery_journal import DeliveryJournal

DEFAULT_RETRY = {
    "max_attempts": 3,
    "backoff_ms": 1000,
    "backoff_multiplier": 2,
    "max_backoff_ms": 30000,
    "ack_timeout_ms": 30000,
}


def retry_delay(attempt: int, policy: dict | None = None) -> int:
    if policy is None:
        policy = DEFAULT_RETRY
    return min(
        policy["backoff_ms"] * (policy["backoff_multiplier"] ** (attempt - 1)),
        policy["max_backoff_ms"],
    )


class DeliveryTracker:
    def __init__(self, store: InMemoryDeliveryStore | None = None, journal: DeliveryJournal | None = None,
                 start_sequence: int = 0, stream_id: str = "stream_01"):
        self._store = store or InMemoryDeliveryStore(start_sequence=start_sequence, stream_id=stream_id)
        self._journal = journal or DeliveryJournal(stream_id=stream_id)

    def next_sequence(self) -> int:
        return self._store.next_sequence()

    @property
    def cursor(self) -> str:
        stream_id = getattr(self._store, "_stream_id", "stream_01")
        seq = getattr(self._store, "_sequence", 0)
        return f"{stream_id}:{seq}"

    @property
    def last_acknowledged_cursor(self) -> str:
        stats = self._store.get_stats()
        return stats.get("lastAckCursor") or f"{getattr(self._store, '_stream_id', 'stream_01')}:0"

    def track(self, event_id: str, subscription_id: str = "_default") -> int:
        seq = self._store.track(event_id, subscription_id)
        self._journal.append({"type": "delivery.tracked", "eventId": event_id, "subscriptionId": subscription_id, "sequence": seq})
        return seq

    def ack(self, event_id: str) -> bool:
        return self._store.ack(event_id)

    def nack(self, event_id: str) -> int | bool:
        return self._store.nack(event_id)

    def get_pending(self) -> list[dict]:
        return self._store.get_pending()

    def get_pending_for_subscription(self, subscription_id: str) -> list[dict]:
        return self._store.get_pending_for_subscription(subscription_id)

    def is_acknowledged(self, event_id: str) -> bool:
        return self._store.is_acknowledged(event_id)

    def is_pending(self, event_id: str) -> bool:
        return self._store.is_pending(event_id)

    def has_attempts_remaining(self, event_id: str, max_attempts: int | None = None) -> bool:
        if max_attempts is None:
            max_attempts = DEFAULT_RETRY["max_attempts"]
        return self._store.has_attempts_remaining(event_id, max_attempts)

    def dead_letter(self, event_id: str, reason: dict | None = None) -> dict | None:
        return self._store.dead_letter(event_id, reason)

    @property
    def dead_lettered(self) -> dict:
        return dict(getattr(self._store, "_dead_lettered", {}))

    @property
    def stats(self) -> dict:
        return self._store.get_stats()
```

- [ ] **Step 4: Run delivery tests**

```bash
cd reference/python
python -m pytest tests/test_delivery.py -q
```

Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add reference/python/src/aep/delivery.py reference/python/tests/test_delivery.py
git commit -m "feat: add Python DeliveryTracker with store and journal"
```

Expected: commit succeeds.

---

### Task 4: Package Exports, Verification, And Push

**Files:**
- Modify: `reference/python/src/aep/__init__.py`

- [ ] **Step 1: Update package exports**

In `reference/python/src/aep/__init__.py`, add after the existing imports:

```python
from .delivery import DeliveryTracker, retry_delay, DEFAULT_RETRY
from .delivery_store import InMemoryDeliveryStore
from .delivery_journal import DeliveryJournal
```

And update `__all__` to include:

```python
"DeliveryTracker", "retry_delay", "DEFAULT_RETRY",
"InMemoryDeliveryStore",
"DeliveryJournal",
```

- [ ] **Step 2: Full Python verification**

```bash
cd reference/python
python -m pytest --tb=short -q
```

Expected: all tests pass (48 previous + 23 new = 71).

- [ ] **Step 3: Full cross-language verification**

```bash
cd reference/typescript && npm test && npm run conformance
cd reference/go && go test ./aep/ -v
```

Expected: all pass.

- [ ] **Step 4: Commit and push**

```bash
git add reference/python/src/aep/__init__.py
git commit -m "feat: export Python delivery modules"
git status --short
git log --oneline -5
git push
```

Expected: clean tree, push succeeds.

---

## Self-Review Notes

- Spec coverage: Task 1 covers store, Task 2 covers journal, Task 3 covers tracker, Task 4 covers exports + verification + push.
- Placeholder scan: no TBD/TODO/fill-in markers.
- Type consistency: Python method names use snake_case, TS uses camelCase — test assertions match implementation. Store stat keys like `totalSequences` match TS for fixture compatibility.
