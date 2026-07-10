# Reliability Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pluggable DeliveryStore interface, an InMemoryDeliveryStore implementation, and a DeliveryJournal to the TypeScript delivery subsystem, then refactor DeliveryTracker to use them.

**Architecture:** Three new modules under `reference/typescript/src/` define a store contract, an in-memory backing store, and a replay journal. DeliveryTracker is refactored to accept `store` and `journal` constructor options with backward-compatible defaults. No protocol changes.

**Tech Stack:** Node ESM, `node:test`, `node:assert`. Zero new dependencies.

---

## File Structure

- Create: `reference/typescript/src/delivery-store-memory.js` — InMemoryDeliveryStore with Map-based storage, mirroring current DeliveryTracker internals.
- Create: `reference/typescript/src/delivery-journal.js` — DeliveryJournal for sequence-ordered event retention and replay.
- Create: `reference/typescript/test/delivery-store.test.js` — unit tests for the in-memory store contract.
- Create: `reference/typescript/test/delivery-journal.test.js` — unit tests for journal append/replay/purge.
- Modify: `reference/typescript/src/delivery.js` — refactor DeliveryTracker to accept and delegate to store/journal.
- Modify: `reference/typescript/test/delivery.test.js` — add one test verifying store injection and verify 10 existing tests pass unchanged.
- Modify: `reference/typescript/README.md` — add new modules to current scope.

---

### Task 1: InMemoryDeliveryStore

**Files:**
- Create: `reference/typescript/src/delivery-store-memory.js`
- Create: `reference/typescript/test/delivery-store.test.js`

- [ ] **Step 1: Write failing store tests**

Create `reference/typescript/test/delivery-store.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryDeliveryStore } from "../src/delivery-store-memory.js";

test("InMemoryDeliveryStore tracks and acknowledges events", () => {
  const store = new InMemoryDeliveryStore();

  const seq = store.track("evt_001", "sub_01", { eventId: "evt_001", subscriptionId: "sub_01" });
  assert.equal(seq, 1);

  assert.equal(store.isPending("evt_001"), true);
  assert.equal(store.isAcknowledged("evt_001"), false);

  const acked = store.ack("evt_001");
  assert.equal(acked, true);
  assert.equal(store.isAcknowledged("evt_001"), true);
  assert.equal(store.isPending("evt_001"), false);
});

test("InMemoryDeliveryStore nacks and increments attempts", () => {
  const store = new InMemoryDeliveryStore();

  store.track("evt_001", "sub_01", {});
  const attempts = store.nack("evt_001");
  assert.equal(attempts, 2);

  const pending = store.getPending();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].attempts, 2);
});

test("InMemoryDeliveryStore dead-letters exhausted events", () => {
  const store = new InMemoryDeliveryStore();

  store.track("evt_001", "sub_01", {});
  const dlq = store.deadLetter("evt_001", { error: { code: "timeout", message: "no ack" } });
  assert.ok(dlq);
  assert.equal(dlq.payload.attempts, 1);
  assert.equal(dlq.payload.original_event_id, "evt_001");
  assert.equal(store.isPending("evt_001"), false);
});

test("InMemoryDeliveryStore provides stats", () => {
  const store = new InMemoryDeliveryStore();
  store.track("evt_a", "sub_01", {});
  store.track("evt_b", "sub_01", {});
  store.ack("evt_a");
  store.track("evt_c", "sub_02", {});
  store.deadLetter("evt_c", {});

  const stats = store.getStats();
  assert.equal(stats.totalSequences, 3);
  assert.equal(stats.pending, 1);
  assert.equal(stats.acknowledged, 1);
  assert.equal(stats.deadLettered, 1);
});

test("InMemoryDeliveryStore nack returns false for unknown events", () => {
  const store = new InMemoryDeliveryStore();
  assert.equal(store.nack("nonexistent"), false);
});

test("InMemoryDeliveryStore deadLetter returns null for unknown events", () => {
  const store = new InMemoryDeliveryStore();
  assert.equal(store.deadLetter("nonexistent"), null);
});

test("InMemoryDeliveryStore hasAttemptsRemaining checks max attempts", () => {
  const store = new InMemoryDeliveryStore();
  store.track("evt_001", "sub_01", {});
  assert.equal(store.hasAttemptsRemaining("evt_001", 3), true);
  store.nack("evt_001");
  store.nack("evt_001");
  assert.equal(store.hasAttemptsRemaining("evt_001", 3), false);
});

test("InMemoryDeliveryStore getPendingForSubscription filters correctly", () => {
  const store = new InMemoryDeliveryStore();
  store.track("evt_a", "sub_01", {});
  store.track("evt_b", "sub_02", {});
  store.track("evt_c", "sub_01", {});

  const filtered = store.getPendingForSubscription("sub_01");
  assert.equal(filtered.length, 2);
  assert.deepEqual(filtered.map((e) => e.eventId), ["evt_a", "evt_c"]);
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd reference/typescript
npm test -- test/delivery-store.test.js
```

Expected: FAIL with module not found for `../src/delivery-store-memory.js`.

- [ ] **Step 3: Implement InMemoryDeliveryStore**

Create `reference/typescript/src/delivery-store-memory.js`:

```js
export class InMemoryDeliveryStore {
  constructor(options = {}) {
    this._sequence = options.startSequence ?? 0;
    this._streamId = options.streamId ?? "stream_01";
    this._pending = new Map();
    this._acked = new Set();
    this._deadLettered = new Map();
    this._lastAckCursor = null;
  }

  nextSequence() {
    return ++this._sequence;
  }

  track(eventId, subscriptionId, data = {}) {
    const seq = this.nextSequence();
    this._pending.set(eventId, {
      eventId,
      subscriptionId,
      sequence: seq,
      cursor: `${this._streamId}:${seq}`,
      attempts: 1,
      firstAttemptAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      nextRetryAt: null,
      ...data
    });
    return seq;
  }

  ack(eventId) {
    const entry = this._pending.get(eventId);
    if (!entry) return false;
    this._pending.delete(eventId);
    this._acked.add(eventId);
    this._lastAckCursor = entry.cursor;
    return true;
  }

  nack(eventId) {
    const entry = this._pending.get(eventId);
    if (!entry) return false;
    entry.attempts++;
    entry.lastAttemptAt = new Date().toISOString();
    return entry.attempts;
  }

  deadLetter(eventId, reason = {}) {
    const entry = this._pending.get(eventId);
    if (!entry) return null;
    this._pending.delete(eventId);
    const record = {
      ...entry,
      deadLetteredAt: new Date().toISOString(),
      reason
    };
    this._deadLettered.set(eventId, record);
    return {
      type: "event.dead_lettered",
      payload: {
        original_event_id: eventId,
        subscription_id: entry.subscriptionId,
        cursor: entry.cursor,
        attempts: entry.attempts,
        last_attempt_at: entry.lastAttemptAt,
        error: reason.error ?? null
      }
    };
  }

  getPending() {
    return [...this._pending.values()];
  }

  getPendingForSubscription(subscriptionId) {
    return this.getPending().filter((e) => e.subscriptionId === subscriptionId);
  }

  isAcknowledged(eventId) {
    return this._acked.has(eventId);
  }

  isPending(eventId) {
    return this._pending.has(eventId);
  }

  hasAttemptsRemaining(eventId, maxAttempts) {
    const entry = this._pending.get(eventId);
    if (!entry) return false;
    return entry.attempts < maxAttempts;
  }

  getStats() {
    return {
      totalSequences: this._sequence,
      pending: this._pending.size,
      acknowledged: this._acked.size,
      deadLettered: this._deadLettered.size,
      lastAckCursor: this._lastAckCursor
    };
  }
}
```

- [ ] **Step 4: Run store tests**

```bash
cd reference/typescript
npm test -- test/delivery-store.test.js
```

Expected: PASS, 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add reference/typescript/src/delivery-store-memory.js reference/typescript/test/delivery-store.test.js
git commit -m "feat: add InMemoryDeliveryStore with tests"
```

Expected: commit succeeds.

---

### Task 2: DeliveryJournal

**Files:**
- Create: `reference/typescript/src/delivery-journal.js`
- Create: `reference/typescript/test/delivery-journal.test.js`

- [ ] **Step 1: Write failing journal tests**

Create `reference/typescript/test/delivery-journal.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { DeliveryJournal } from "../src/delivery-journal.js";

test("DeliveryJournal appends events with sequence", () => {
  const journal = new DeliveryJournal();
  const seq1 = journal.append({ type: "task.submitted", task_id: "task_01" });
  const seq2 = journal.append({ type: "task.completed", task_id: "task_01" });
  assert.equal(seq1, 1);
  assert.equal(seq2, 2);
});

test("DeliveryJournal replays events since cursor", () => {
  const journal = new DeliveryJournal();
  journal.append({ type: "task.submitted" });
  journal.append({ type: "task.started" });
  journal.append({ type: "task.completed" });

  const events = journal.replay("stream_01:1");
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "task.started");
  assert.equal(events[1].type, "task.completed");
});

test("DeliveryJournal replays all events with default cursor", () => {
  const journal = new DeliveryJournal();
  journal.append({ type: "task.submitted" });
  journal.append({ type: "task.started" });

  const events = journal.replay();
  assert.equal(events.length, 2);
});

test("DeliveryJournal purges events before cursor", () => {
  const journal = new DeliveryJournal();
  journal.append({ type: "evt_1" });
  journal.append({ type: "evt_2" });
  journal.append({ type: "evt_3" });

  const removed = journal.purge("stream_01:2");
  assert.equal(removed, 2);

  const events = journal.replay();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "evt_3");
});

test("DeliveryJournal provides stats", () => {
  const journal = new DeliveryJournal();
  journal.append({ type: "evt_1" });
  journal.append({ type: "evt_2" });

  const stats = journal.getStats();
  assert.equal(stats.totalEvents, 2);
  assert.equal(stats.oldestSequence, 1);
  assert.equal(stats.newestSequence, 2);
});

test("DeliveryJournal stats are empty for new journal", () => {
  const journal = new DeliveryJournal();
  const stats = journal.getStats();
  assert.equal(stats.totalEvents, 0);
  assert.equal(stats.oldestSequence, null);
  assert.equal(stats.newestSequence, null);
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd reference/typescript
npm test -- test/delivery-journal.test.js
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement DeliveryJournal**

Create `reference/typescript/src/delivery-journal.js`:

```js
export class DeliveryJournal {
  constructor(options = {}) {
    this._streamId = options.streamId ?? "stream_01";
    this._events = [];
    this._sequence = 0;
  }

  nextSequence() {
    return ++this._sequence;
  }

  append(event) {
    const seq = this.nextSequence();
    const record = {
      ...event,
      _journal_sequence: seq,
      _journal_cursor: `${this._streamId}:${seq}`,
      _journal_appendedAt: new Date().toISOString()
    };
    this._events.push(record);
    return seq;
  }

  replay(cursor) {
    if (!cursor) return [...this._events];
    const parts = cursor.split(":");
    const sinceSeq = parseInt(parts[1] ?? "0", 10);
    return this._events.filter((e) => e._journal_sequence > sinceSeq);
  }

  replaySinceSequence(seq) {
    return this._events.filter((e) => e._journal_sequence > seq);
  }

  purge(cursor) {
    const parts = cursor.split(":");
    const beforeSeq = parseInt(parts[1] ?? "0", 10);
    let removed = 0;
    while (this._events.length > 0 && this._events[0]._journal_sequence <= beforeSeq) {
      this._events.shift();
      removed++;
    }
    return removed;
  }

  getStats() {
    return {
      totalEvents: this._events.length,
      oldestSequence: this._events.length > 0 ? this._events[0]._journal_sequence : null,
      newestSequence: this._events.length > 0 ? this._events[this._events.length - 1]._journal_sequence : null
    };
  }
}
```

- [ ] **Step 4: Run journal tests**

```bash
cd reference/typescript
npm test -- test/delivery-journal.test.js
```

Expected: PASS, 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add reference/typescript/src/delivery-journal.js reference/typescript/test/delivery-journal.test.js
git commit -m "feat: add DeliveryJournal with tests"
```

Expected: commit succeeds.

---

### Task 3: Refactor DeliveryTracker

**Files:**
- Modify: `reference/typescript/src/delivery.js`
- Modify: `reference/typescript/test/delivery.test.js`

- [ ] **Step 1: Add store injection test**

In `reference/typescript/test/delivery.test.js`, add this test at the end of the file (before the closing code):

```js
test("DeliveryTracker uses provided store and journal", () => {
  const store = new (await import("../src/delivery-store-memory.js")).InMemoryDeliveryStore();
  const journal = new (await import("../src/delivery-journal.js")).DeliveryJournal();
  const tracker = new DeliveryTracker({ store, journal });

  const seq = tracker.track("evt_store_001");
  assert.equal(seq, 1);
  assert.equal(store.isPending("evt_store_001"), true);

  tracker.ack("evt_store_001");
  assert.equal(store.isAcknowledged("evt_store_001"), true);

  journal.append({ type: "task.submitted" });
  assert.equal(journal.getStats().totalEvents, 1);

  const stats = tracker.stats;
  assert.equal(stats.pending, 0);
  assert.equal(stats.acknowledged, 1);
});
```

Since `import` statements must be at the top of the file, add these at the top of `delivery.test.js` after the existing import:

```js
import { InMemoryDeliveryStore } from "../src/delivery-store-memory.js";
import { DeliveryJournal } from "../src/delivery-journal.js";
```

And in the test body, use them directly:
```js
test("DeliveryTracker uses provided store and journal", () => {
  const store = new InMemoryDeliveryStore();
  const journal = new DeliveryJournal();
  const tracker = new DeliveryTracker({ store, journal });
  // ...rest of test
});
```

- [ ] **Step 2: Run existing tests to confirm they still pass**

```bash
cd reference/typescript
npm test -- test/delivery.test.js
```

Expected: 10 existing tests pass (new test fails due to refactored code not yet implementing store injection).

- [ ] **Step 3: Refactor DeliveryTracker**

Replace `reference/typescript/src/delivery.js` with:

```js
import { InMemoryDeliveryStore } from "./delivery-store-memory.js";
import { DeliveryJournal } from "./delivery-journal.js";

const DEFAULT_RETRY = {
  max_attempts: 3,
  backoff_ms: 1000,
  backoff_multiplier: 2,
  max_backoff_ms: 30000,
  ack_timeout_ms: 30000
};

export function retryDelay(attempt, policy = DEFAULT_RETRY) {
  return Math.min(
    policy.backoff_ms * Math.pow(policy.backoff_multiplier, attempt - 1),
    policy.max_backoff_ms
  );
}

export class DeliveryTracker {
  constructor(options = {}) {
    this._store = options.store ?? new InMemoryDeliveryStore({ startSequence: options.startSequence, streamId: options.streamId });
    this._journal = options.journal ?? new DeliveryJournal({ streamId: options.streamId });
  }

  nextSequence() {
    return this._store.nextSequence();
  }

  get cursor() {
    return `${this._store._streamId ?? "stream_01"}:${this._store._sequence ?? 0}`;
  }

  get lastAcknowledgedCursor() {
    const stats = this._store.getStats();
    return stats.lastAckCursor ?? `${this._store._streamId ?? "stream_01"}:0`;
  }

  track(eventId, subscriptionId = "_default") {
    const seq = this._store.track(eventId, subscriptionId, {});
    this._journal.append({ type: "delivery.tracked", eventId, subscriptionId, sequence: seq });
    return seq;
  }

  ack(eventId) {
    return this._store.ack(eventId);
  }

  nack(eventId) {
    return this._store.nack(eventId);
  }

  getPending() {
    return this._store.getPending();
  }

  getPendingForSubscription(subscriptionId) {
    return this._store.getPendingForSubscription(subscriptionId);
  }

  isAcknowledged(eventId) {
    return this._store.isAcknowledged(eventId);
  }

  isPending(eventId) {
    return this._store.isPending(eventId);
  }

  hasAttemptsRemaining(eventId, maxAttempts = DEFAULT_RETRY.max_attempts) {
    return this._store.hasAttemptsRemaining(eventId, maxAttempts);
  }

  deadLetter(eventId, reason = {}) {
    return this._store.deadLetter(eventId, reason);
  }

  get deadLettered() {
    return new Map(this._store._deadLettered ?? new Map());
  }

  get stats() {
    return this._store.getStats();
  }
}
```

- [ ] **Step 4: Run all delivery tests**

```bash
cd reference/typescript
npm test -- test/delivery.test.js
```

Expected: PASS, 11 tests pass (10 existing + 1 new store injection test).

- [ ] **Step 5: Run full TypeScript test suite**

```bash
cd reference/typescript
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add reference/typescript/src/delivery.js reference/typescript/test/delivery.test.js
git commit -m "refactor: extract DeliveryTracker store and journal"
```

Expected: commit succeeds.

---

### Task 4: Documentation And Full Verification

**Files:**
- Modify: `reference/typescript/README.md`

- [ ] **Step 1: Update TypeScript README scope**

In `reference/typescript/README.md`, replace the scope line:

```markdown
- Delivery tracking with ack/retry/dead-letter helpers
```

with:

```markdown
- Delivery tracking with ack/retry/dead-letter helpers, pluggable store, and event journal
```

- [ ] **Step 2: Full TypeScript verification**

```bash
cd reference/typescript
npm test
npm run conformance
npm run demo:async-tool
npm run demo:mcp-aep-consumer
```

Expected: all passed.

- [ ] **Step 3: Full Python verification**

```bash
cd reference/python
python -m pytest --tb=short -q
```

Expected: all 48 passed.

- [ ] **Step 4: Full Go verification**

```bash
cd reference/go
go test ./aep/ -v
```

Expected: all 17 passed.

- [ ] **Step 5: Commit and push**

```bash
git add reference/typescript/README.md
git commit -m "docs: update TypeScript delivery scope"
git status --short
git log --oneline -5
git push
```

Expected: clean tree, push succeeds.

---

## Self-Review Notes

- Spec coverage: Task 1 covers store interface + InMemoryStore. Task 2 covers journal. Task 3 refactors DeliveryTracker. Task 4 verifies and pushes.
- Scope: no file/persistent store, no protocol changes, no Go/Python store implementations.
- Placeholder scan: no TBD/TODO/fill-in markers remain.
- Type consistency: store methods (track/ack/nack/deadLetter/getStats) match between store implementation, DeliveryTracker delegation, and tests. Journal methods (append/replay/purge/getStats) match across implementation and tests.
