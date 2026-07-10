# Java Delivery Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the TypeScript delivery subsystem (InMemoryDeliveryStore, DeliveryJournal, DeliveryTracker) to Java with identical behavior and test coverage.

**Architecture:** Three new Java classes mirror the TypeScript/Python implementations. DeliveryTracker delegates to pluggable store and journal. All existing tests continue to pass.

**Tech Stack:** JDK 21, Maven, JUnit 5. No new dependencies beyond existing Jackson.

---

## File Structure

- Create: `reference/java/src/main/java/com/axisrobo/aep/InMemoryDeliveryStore.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/DeliveryJournal.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/DeliveryTracker.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/DeliveryJournalTest.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/DeliveryTrackerTest.java`
- Modify: `reference/java/README.md`

---

### Task 1: InMemoryDeliveryStore

**Files:**
- Create: `reference/java/src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/InMemoryDeliveryStore.java`

- [ ] **Step 1: Write failing test**

Create `reference/java/src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class InMemoryDeliveryStoreTest {

    @Test
    void tracksAndAcknowledgesEvents() {
        var store = new InMemoryDeliveryStore();
        var seq = store.track("evt_001", "sub_01");
        assertEquals(1, seq);
        assertTrue(store.isPending("evt_001"));
        assertFalse(store.isAcknowledged("evt_001"));
        assertTrue(store.ack("evt_001"));
        assertTrue(store.isAcknowledged("evt_001"));
        assertFalse(store.isPending("evt_001"));
    }

    @Test
    void nacksAndIncrementsAttempts() {
        var store = new InMemoryDeliveryStore();
        store.track("evt_001", "sub_01");
        var attempts = store.nack("evt_001");
        assertEquals(2, attempts);
        var pending = store.getPending();
        assertEquals(1, pending.size());
        assertEquals(2, pending.get(0).get("attempts"));
    }

    @Test
    void deadLettersExhaustedEvents() {
        var store = new InMemoryDeliveryStore();
        store.track("evt_001", "sub_01");
        var dlq = store.deadLetter("evt_001", Map.of("error", Map.of("code", "timeout", "message", "no ack")));
        assertNotNull(dlq);
        assertEquals(1, ((Map<?,?>) dlq.get("payload")).get("attempts"));
        assertEquals("evt_001", ((Map<?,?>) dlq.get("payload")).get("original_event_id"));
        assertFalse(store.isPending("evt_001"));
    }

    @Test
    void providesStats() {
        var store = new InMemoryDeliveryStore();
        store.track("evt_a", "sub_01");
        store.track("evt_b", "sub_01");
        store.ack("evt_a");
        store.track("evt_c", "sub_02");
        store.deadLetter("evt_c", Map.of());
        var stats = store.getStats();
        assertEquals(3, stats.get("totalSequences"));
        assertEquals(1, stats.get("pending"));
        assertEquals(1, stats.get("acknowledged"));
        assertEquals(1, stats.get("deadLettered"));
    }

    @Test
    void nackReturnsFalseForUnknownEvents() {
        var store = new InMemoryDeliveryStore();
        assertFalse(store.nack("nonexistent"));
    }

    @Test
    void deadLetterReturnsNullForUnknownEvents() {
        var store = new InMemoryDeliveryStore();
        assertNull(store.deadLetter("nonexistent"));
    }

    @Test
    void hasAttemptsRemainingChecksMax() {
        var store = new InMemoryDeliveryStore();
        store.track("evt_001", "sub_01");
        assertTrue(store.hasAttemptsRemaining("evt_001", 3));
        store.nack("evt_001");
        store.nack("evt_001");
        assertFalse(store.hasAttemptsRemaining("evt_001", 3));
    }

    @Test
    void getPendingForSubscriptionFilters() {
        var store = new InMemoryDeliveryStore();
        store.track("evt_a", "sub_01");
        store.track("evt_b", "sub_02");
        store.track("evt_c", "sub_01");
        var filtered = store.getPendingForSubscription("sub_01");
        assertEquals(2, filtered.size());
        assertEquals("evt_a", filtered.get(0).get("eventId"));
        assertEquals("evt_c", filtered.get(1).get("eventId"));
    }
}
```

- [ ] **Step 2: Run to verify failure**

```bash
cd reference/java && mvn test -pl . -Dtest=InMemoryDeliveryStoreTest -q
```

Expected: FAIL (compilation error).

- [ ] **Step 3: Implement**

Create `reference/java/src/main/java/com/axisrobo/aep/InMemoryDeliveryStore.java`:

```java
package com.axisrobo.aep;

import java.time.Instant;
import java.util.*;

public class InMemoryDeliveryStore {
    private int sequence;
    private final String streamId;
    private final Map<String, Map<String, Object>> pending = new LinkedHashMap<>();
    private final Set<String> acked = new HashSet<>();
    private final Map<String, Map<String, Object>> deadLettered = new LinkedHashMap<>();
    private String lastAckCursor;

    public InMemoryDeliveryStore() {
        this(0, "stream_01");
    }

    public InMemoryDeliveryStore(int startSequence, String streamId) {
        this.sequence = startSequence;
        this.streamId = streamId;
    }

    public int nextSequence() {
        return ++sequence;
    }

    public int track(String eventId, String subscriptionId) {
        var seq = nextSequence();
        var entry = new LinkedHashMap<String, Object>();
        entry.put("eventId", eventId);
        entry.put("subscriptionId", subscriptionId);
        entry.put("sequence", seq);
        entry.put("cursor", streamId + ":" + seq);
        entry.put("attempts", 1);
        entry.put("firstAttemptAt", Instant.now().toString());
        entry.put("lastAttemptAt", Instant.now().toString());
        entry.put("nextRetryAt", null);
        pending.put(eventId, entry);
        return seq;
    }

    public boolean ack(String eventId) {
        var entry = pending.remove(eventId);
        if (entry == null) return false;
        acked.add(eventId);
        lastAckCursor = (String) entry.get("cursor");
        return true;
    }

    public Object nack(String eventId) {
        var entry = pending.get(eventId);
        if (entry == null) return false;
        entry.put("attempts", (int) entry.get("attempts") + 1);
        entry.put("lastAttemptAt", Instant.now().toString());
        return entry.get("attempts");
    }

    public Map<String, Object> deadLetter(String eventId, Map<String, Object> reason) {
        var entry = pending.remove(eventId);
        if (entry == null) return null;
        if (reason == null) reason = Map.of();
        var record = new LinkedHashMap<>(entry);
        record.put("deadLetteredAt", Instant.now().toString());
        record.put("reason", new HashMap<>(reason));
        deadLettered.put(eventId, record);
        return Map.of(
            "type", "event.dead_lettered",
            "payload", Map.of(
                "original_event_id", eventId,
                "subscription_id", entry.get("subscriptionId"),
                "cursor", entry.get("cursor"),
                "attempts", entry.get("attempts"),
                "last_attempt_at", entry.get("lastAttemptAt"),
                "error", reason.get("error")
            )
        );
    }

    public List<Map<String, Object>> getPending() {
        return pending.values().stream()
            .map(LinkedHashMap::new)
            .map(m -> (Map<String, Object>) m)
            .toList();
    }

    public List<Map<String, Object>> getPendingForSubscription(String subscriptionId) {
        return pending.values().stream()
            .filter(e -> subscriptionId.equals(e.get("subscriptionId")))
            .map(LinkedHashMap::new)
            .map(m -> (Map<String, Object>) (Map<?, ?>) m)
            .toList();
    }

    public boolean isAcknowledged(String eventId) {
        return acked.contains(eventId);
    }

    public boolean isPending(String eventId) {
        return pending.containsKey(eventId);
    }

    public boolean hasAttemptsRemaining(String eventId, int maxAttempts) {
        var entry = pending.get(eventId);
        if (entry == null) return false;
        return (int) entry.get("attempts") < maxAttempts;
    }

    public Map<String, Object> getStats() {
        return Map.of(
            "totalSequences", sequence,
            "pending", pending.size(),
            "acknowledged", acked.size(),
            "deadLettered", deadLettered.size(),
            "lastAckCursor", lastAckCursor
        );
    }
}
```

- [ ] **Step 4: Run tests**

```bash
cd reference/java && mvn test -pl . -Dtest=InMemoryDeliveryStoreTest -q
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/InMemoryDeliveryStore.java reference/java/src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java
git commit -m "feat: add Java InMemoryDeliveryStore with tests"
```

---

### Task 2: DeliveryJournal

**Files:**
- Create: `reference/java/src/test/java/com/axisrobo/aep/DeliveryJournalTest.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/DeliveryJournal.java`

- [ ] **Step 1: Write failing test**

Create `reference/java/src/test/java/com/axisrobo/aep/DeliveryJournalTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class DeliveryJournalTest {

    @Test
    void appendsEventsWithSequence() {
        var journal = new DeliveryJournal();
        var seq1 = journal.append(Map.of("type", "task.submitted", "task_id", "task_01"));
        var seq2 = journal.append(Map.of("type", "task.completed", "task_id", "task_01"));
        assertEquals(1, seq1);
        assertEquals(2, seq2);
    }

    @Test
    void replaysEventsSinceCursor() {
        var journal = new DeliveryJournal();
        journal.append(Map.of("type", "task.submitted"));
        journal.append(Map.of("type", "task.started"));
        journal.append(Map.of("type", "task.completed"));
        var events = journal.replay("stream_01:1");
        assertEquals(2, events.size());
        assertEquals("task.started", events.get(0).get("type"));
        assertEquals("task.completed", events.get(1).get("type"));
    }

    @Test
    void replaysAllEventsWithDefaultCursor() {
        var journal = new DeliveryJournal();
        journal.append(Map.of("type", "task.submitted"));
        journal.append(Map.of("type", "task.started"));
        var events = journal.replay(null);
        assertEquals(2, events.size());
    }

    @Test
    void purgesEventsBeforeCursor() {
        var journal = new DeliveryJournal();
        journal.append(Map.of("type", "evt_1"));
        journal.append(Map.of("type", "evt_2"));
        journal.append(Map.of("type", "evt_3"));
        var removed = journal.purge("stream_01:2");
        assertEquals(2, removed);
        var events = journal.replay(null);
        assertEquals(1, events.size());
        assertEquals("evt_3", events.get(0).get("type"));
    }

    @Test
    void providesStats() {
        var journal = new DeliveryJournal();
        journal.append(Map.of("type", "evt_1"));
        journal.append(Map.of("type", "evt_2"));
        var stats = journal.getStats();
        assertEquals(2, stats.get("totalEvents"));
        assertEquals(1, stats.get("oldestSequence"));
        assertEquals(2, stats.get("newestSequence"));
    }

    @Test
    void statsAreEmptyForNewJournal() {
        var journal = new DeliveryJournal();
        var stats = journal.getStats();
        assertEquals(0, stats.get("totalEvents"));
        assertNull(stats.get("oldestSequence"));
        assertNull(stats.get("newestSequence"));
    }
}
```

- [ ] **Step 2: Run to verify failure**

```bash
cd reference/java && mvn test -pl . -Dtest=DeliveryJournalTest -q
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `reference/java/src/main/java/com/axisrobo/aep/DeliveryJournal.java`:

```java
package com.axisrobo.aep;

import java.time.Instant;
import java.util.*;

public class DeliveryJournal {
    private final String streamId;
    private final List<Map<String, Object>> events = new ArrayList<>();
    private int sequence;

    public DeliveryJournal() {
        this("stream_01");
    }

    public DeliveryJournal(String streamId) {
        this.streamId = streamId;
    }

    public int nextSequence() {
        return ++sequence;
    }

    public int append(Map<String, Object> event) {
        var seq = nextSequence();
        var record = new LinkedHashMap<>(event);
        record.put("_journal_sequence", seq);
        record.put("_journal_cursor", streamId + ":" + seq);
        record.put("_journal_appendedAt", Instant.now().toString());
        events.add(record);
        return seq;
    }

    public List<Map<String, Object>> replay(String cursor) {
        if (cursor == null) return List.copyOf(events);
        var parts = cursor.split(":");
        var sinceSeq = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
        return events.stream()
            .filter(e -> (int) e.get("_journal_sequence") > sinceSeq)
            .toList();
    }

    public List<Map<String, Object>> replaySinceSequence(int seq) {
        return events.stream()
            .filter(e -> (int) e.get("_journal_sequence") > seq)
            .toList();
    }

    public int purge(String cursor) {
        var parts = cursor.split(":");
        var beforeSeq = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
        int removed = 0;
        while (!events.isEmpty() && (int) events.get(0).get("_journal_sequence") <= beforeSeq) {
            events.remove(0);
            removed++;
        }
        return removed;
    }

    public Map<String, Object> getStats() {
        return Map.of(
            "totalEvents", events.size(),
            "oldestSequence", events.isEmpty() ? null : events.get(0).get("_journal_sequence"),
            "newestSequence", events.isEmpty() ? null : events.get(events.size() - 1).get("_journal_sequence")
        );
    }
}
```

- [ ] **Step 4: Run tests**

```bash
cd reference/java && mvn test -pl . -Dtest=DeliveryJournalTest -q
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/DeliveryJournal.java reference/java/src/test/java/com/axisrobo/aep/DeliveryJournalTest.java
git commit -m "feat: add Java DeliveryJournal with tests"
```

---

### Task 3: DeliveryTracker

**Files:**
- Create: `reference/java/src/test/java/com/axisrobo/aep/DeliveryTrackerTest.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/DeliveryTracker.java`

- [ ] **Step 1: Write failing test**

Create `reference/java/src/test/java/com/axisrobo/aep/DeliveryTrackerTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class DeliveryTrackerTest {

    @Test
    void retryDelayComputesExponentialBackoff() {
        assertEquals(1000, DeliveryTracker.retryDelay(1, null));
        assertEquals(2000, DeliveryTracker.retryDelay(2, null));
        assertEquals(4000, DeliveryTracker.retryDelay(3, null));
    }

    @Test
    void retryDelayRespectsMaxBackoff() {
        assertEquals(DeliveryTracker.DEFAULT_RETRY.get("max_backoff_ms"),
            DeliveryTracker.retryDelay(10, null));
    }

    @Test
    void assignsMonotonicallyIncreasingSequences() {
        var tracker = new DeliveryTracker();
        assertEquals(1, tracker.track("evt_001"));
        assertEquals(2, tracker.track("evt_002"));
    }

    @Test
    void acknowledgesEvents() {
        var tracker = new DeliveryTracker();
        tracker.track("evt_001");
        assertTrue(tracker.ack("evt_001"));
        assertTrue(tracker.isAcknowledged("evt_001"));
        assertFalse(tracker.isPending("evt_001"));
    }

    @Test
    void nacksAndRetries() {
        var tracker = new DeliveryTracker();
        tracker.track("evt_001");
        assertEquals(2, tracker.nack("evt_001"));
    }

    @Test
    void deadLettersExhaustedEvents() {
        var tracker = new DeliveryTracker();
        tracker.track("evt_001");
        var dlq = tracker.deadLetter("evt_001", null);
        assertNotNull(dlq);
        assertEquals("event.dead_lettered", dlq.get("type"));
    }

    @Test
    void getPendingForSubscriptionFilters() {
        var tracker = new DeliveryTracker();
        tracker.track("evt_a", "sub_01");
        tracker.track("evt_b", "sub_02");
        var filtered = tracker.getPendingForSubscription("sub_01");
        assertEquals(1, filtered.size());
        assertEquals("evt_a", filtered.get(0).get("eventId"));
    }

    @Test
    void statsReportsComprehensiveState() {
        var tracker = new DeliveryTracker();
        tracker.track("evt_a");
        tracker.track("evt_b");
        tracker.ack("evt_a");
        var stats = tracker.getStats();
        assertEquals(2, stats.get("totalSequences"));
        assertEquals(1, stats.get("pending"));
        assertEquals(1, stats.get("acknowledged"));
    }

    @Test
    void usesProvidedStoreAndJournal() {
        var store = new InMemoryDeliveryStore();
        var journal = new DeliveryJournal();
        var tracker = new DeliveryTracker(store, journal);
        assertEquals(1, tracker.track("evt_store_001"));
        assertTrue(store.isPending("evt_store_001"));
        tracker.ack("evt_store_001");
        assertTrue(store.isAcknowledged("evt_store_001"));
        journal.append(Map.of("type", "task.submitted"));
        assertEquals(1, journal.getStats().get("totalEvents"));
        var stats = tracker.getStats();
        assertEquals(0, stats.get("pending"));
        assertEquals(1, stats.get("acknowledged"));
    }
}
```

- [ ] **Step 2: Run to verify failure**

```bash
cd reference/java && mvn test -pl . -Dtest=DeliveryTrackerTest -q
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `reference/java/src/main/java/com/axisrobo/aep/DeliveryTracker.java`:

```java
package com.axisrobo.aep;

import java.util.List;
import java.util.Map;

public class DeliveryTracker {

    public static final Map<String, Object> DEFAULT_RETRY = Map.of(
        "max_attempts", 3,
        "backoff_ms", 1000,
        "backoff_multiplier", 2,
        "max_backoff_ms", 30000,
        "ack_timeout_ms", 30000
    );

    @SuppressWarnings("unchecked")
    public static int retryDelay(int attempt, Map<String, Object> policy) {
        if (policy == null) policy = DEFAULT_RETRY;
        var backoff = (int) policy.get("backoff_ms");
        var multiplier = (int) policy.get("backoff_multiplier");
        var max = (int) policy.get("max_backoff_ms");
        return Math.min(backoff * (int) Math.pow(multiplier, attempt - 1), max);
    }

    private final InMemoryDeliveryStore store;
    private final DeliveryJournal journal;

    public DeliveryTracker() {
        this(new InMemoryDeliveryStore(), new DeliveryJournal());
    }

    public DeliveryTracker(InMemoryDeliveryStore store, DeliveryJournal journal) {
        this.store = store;
        this.journal = journal;
    }

    public int nextSequence() {
        return store.nextSequence();
    }

    public int track(String eventId) {
        return track(eventId, "_default");
    }

    public int track(String eventId, String subscriptionId) {
        var seq = store.track(eventId, subscriptionId);
        journal.append(Map.of("type", "delivery.tracked", "eventId", eventId,
            "subscriptionId", subscriptionId, "sequence", seq));
        return seq;
    }

    public boolean ack(String eventId) {
        return store.ack(eventId);
    }

    public Object nack(String eventId) {
        return store.nack(eventId);
    }

    public Map<String, Object> deadLetter(String eventId, Map<String, Object> reason) {
        return store.deadLetter(eventId, reason);
    }

    public List<Map<String, Object>> getPending() {
        return store.getPending();
    }

    public List<Map<String, Object>> getPendingForSubscription(String subscriptionId) {
        return store.getPendingForSubscription(subscriptionId);
    }

    public boolean isAcknowledged(String eventId) {
        return store.isAcknowledged(eventId);
    }

    public boolean isPending(String eventId) {
        return store.isPending(eventId);
    }

    public boolean hasAttemptsRemaining(String eventId, int maxAttempts) {
        return store.hasAttemptsRemaining(eventId, maxAttempts);
    }

    public Map<String, Object> getStats() {
        return store.getStats();
    }
}
```

- [ ] **Step 4: Run tests**

```bash
cd reference/java && mvn test -pl . -Dtest=DeliveryTrackerTest -q
```

Expected: 9 passed.

- [ ] **Step 5: Run all Java tests**

```bash
cd reference/java && mvn test -q
```

Expected: ~40 tests pass (17 existing + 23 new).

- [ ] **Step 6: Commit**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/DeliveryTracker.java reference/java/src/test/java/com/axisrobo/aep/DeliveryTrackerTest.java
git commit -m "feat: add Java DeliveryTracker with store and journal"
```

---

### Task 4: Documentation, Verification, And Push

**Files:**
- Modify: `reference/java/README.md`

- [ ] **Step 1: Update Java README scope**

In `reference/java/README.md`, add after the conformance line:
```markdown
- Delivery tracking with ack/retry/dead-letter helpers, pluggable store, and event journal
```

- [ ] **Step 2: Full verification**

```bash
cd reference/java && mvn test -q
cd reference/typescript && npm test && npm run conformance
cd reference/python && python -m pytest --tb=short -q
cd reference/go && go test ./aep/ -v
```

- [ ] **Step 3: Commit and push**

```bash
git add reference/java/README.md
git commit -m "docs: update Java delivery scope"
git status --short
git push
```
