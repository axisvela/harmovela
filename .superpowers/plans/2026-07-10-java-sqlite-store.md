# Java SQLite Delivery Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a SQLite-backed delivery store to Java that implements the same contract as InMemoryDeliveryStore, enabling durable event persistence.

**Architecture:** Single new class `SqliteDeliveryStore` with same public API as `InMemoryDeliveryStore`, backed by `java.sql`. Uses `:memory:` database in tests for zero filesystem impact. No changes to DeliveryTracker or existing code.

**Tech Stack:** JDK 21, `org.xerial:sqlite-jdbc:3.45.3`, JUnit 5.

---

## File Structure

- Modify: `implementations/java/pom.xml` â€?add sqlite-jdbc dependency
- Create: `implementations/java/src/main/java/com/axisrobo/aep/SqliteDeliveryStore.java`
- Create: `implementations/java/src/test/java/com/axisrobo/aep/SqliteDeliveryStoreTest.java`

---

### Task 1: SQLite Store Implementation

**Files:**
- Modify: `implementations/java/pom.xml`
- Create: `implementations/java/src/main/java/com/axisrobo/aep/SqliteDeliveryStore.java`

- [ ] **Step 1: Add sqlite-jdbc to pom.xml**

Add this dependency inside `<dependencies>` in `implementations/java/pom.xml`:

```xml
<dependency>
    <groupId>org.xerial</groupId>
    <artifactId>sqlite-jdbc</artifactId>
    <version>3.45.3.0</version>
</dependency>
```

- [ ] **Step 2: Run Maven to verify dependency resolves**

```bash
cd implementations/java && mvn compile -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Implement SqliteDeliveryStore**

Create `implementations/java/src/main/java/com/axisrobo/aep/SqliteDeliveryStore.java`:

```java
package com.axisrobo.aep;

import java.sql.*;
import java.time.Instant;
import java.util.*;

public class SqliteDeliveryStore {

    private final String streamId;
    private final Connection conn;
    private int sequence;

    public SqliteDeliveryStore(String url) throws SQLException {
        this(url, "stream_01");
    }

    public SqliteDeliveryStore(String url, String streamId) throws SQLException {
        this.streamId = streamId;
        this.conn = DriverManager.getConnection(url);
        initSchema();
    }

    private void initSchema() throws SQLException {
        try (var stmt = conn.createStatement()) {
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_pending (
                    event_id TEXT PRIMARY KEY,
                    subscription_id TEXT NOT NULL,
                    seq INTEGER NOT NULL,
                    cursor TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 1,
                    first_attempt_at TEXT NOT NULL,
                    last_attempt_at TEXT NOT NULL
                )
                """);
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_acked (
                    event_id TEXT PRIMARY KEY,
                    cursor TEXT NOT NULL,
                    acked_at TEXT NOT NULL
                )
                """);
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_dead_lettered (
                    event_id TEXT PRIMARY KEY,
                    subscription_id TEXT NOT NULL,
                    seq INTEGER NOT NULL,
                    cursor TEXT NOT NULL,
                    attempts INTEGER NOT NULL,
                    last_attempt_at TEXT NOT NULL,
                    reason TEXT NOT NULL DEFAULT '{}',
                    dead_lettered_at TEXT NOT NULL
                )
                """);
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """);
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
                "INSERT INTO delivery_pending (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at) VALUES (?,?,?,?,1,?,?)")) {
            stmt.setString(1, eventId);
            stmt.setString(2, subscriptionId);
            stmt.setInt(3, seq);
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
            try (var stmt = conn.prepareStatement("DELETE FROM delivery_pending WHERE event_id = ?")) {
                stmt.setString(1, eventId);
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO delivery_acked (event_id, cursor, acked_at) VALUES (?,?,?)")) {
                stmt.setString(1, eventId);
                stmt.setString(2, entry.get("cursor"));
                stmt.setString(3, Instant.now().toString());
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT OR REPLACE INTO delivery_meta (key, value) VALUES ('last_ack_cursor', ?)")) {
                stmt.setString(1, entry.get("cursor"));
                stmt.executeUpdate();
            }
        } catch (SQLException e) {
            throw new RuntimeException("ack failed", e);
        }
        return true;
    }

    public Object nack(String eventId) {
        var entry = getPendingEntry(eventId);
        if (entry == null) return false;
        var attempts = Integer.parseInt(entry.get("attempts")) + 1;
        var now = Instant.now().toString();
        try (var stmt = conn.prepareStatement(
                "UPDATE delivery_pending SET attempts = ?, last_attempt_at = ? WHERE event_id = ?")) {
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
        try {
            try (var stmt = conn.prepareStatement("DELETE FROM delivery_pending WHERE event_id = ?")) {
                stmt.setString(1, eventId);
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO delivery_dead_lettered (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at) VALUES (?,?,?,?,?,?,?,?)")) {
                stmt.setString(1, eventId);
                stmt.setString(2, entry.get("subscription_id"));
                stmt.setInt(3, Integer.parseInt(entry.get("seq")));
                stmt.setString(4, entry.get("cursor"));
                stmt.setInt(5, Integer.parseInt(entry.get("attempts")));
                stmt.setString(6, entry.get("last_attempt_at"));
                stmt.setString(7, reason.toString());
                stmt.setString(8, now);
                stmt.executeUpdate();
            }
        } catch (SQLException e) {
            throw new RuntimeException("deadLetter failed", e);
        }
        return Map.of(
            "type", "event.dead_lettered",
            "payload", Map.of(
                "original_event_id", eventId,
                "subscription_id", entry.get("subscription_id"),
                "cursor", entry.get("cursor"),
                "attempts", Integer.parseInt(entry.get("attempts")),
                "last_attempt_at", entry.get("last_attempt_at"),
                "error", reason.get("error")
            )
        );
    }

    public List<Map<String, Object>> getPending() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.createStatement();
             var rs = stmt.executeQuery("SELECT * FROM delivery_pending ORDER BY seq")) {
            while (rs.next()) {
                result.add(rowToPendingMap(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("getPending failed", e);
        }
        return result;
    }

    public List<Map<String, Object>> getPendingForSubscription(String subscriptionId) {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement(
                "SELECT * FROM delivery_pending WHERE subscription_id = ? ORDER BY seq")) {
            stmt.setString(1, subscriptionId);
            try (var rs = stmt.executeQuery()) {
                while (rs.next()) {
                    result.add(rowToPendingMap(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("getPendingForSubscription failed", e);
        }
        return result;
    }

    public boolean isAcknowledged(String eventId) {
        try (var stmt = conn.prepareStatement("SELECT 1 FROM delivery_acked WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            throw new RuntimeException("isAcknowledged failed", e);
        }
    }

    public boolean isPending(String eventId) {
        try (var stmt = conn.prepareStatement("SELECT 1 FROM delivery_pending WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            throw new RuntimeException("isPending failed", e);
        }
    }

    public boolean hasAttemptsRemaining(String eventId, int maxAttempts) {
        try (var stmt = conn.prepareStatement(
                "SELECT attempts FROM delivery_pending WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next() && rs.getInt("attempts") < maxAttempts;
            }
        } catch (SQLException e) {
            throw new RuntimeException("hasAttemptsRemaining failed", e);
        }
    }

    public Map<String, Object> getStats() {
        try (var stmt = conn.createStatement()) {
            var pending = count(stmt, "delivery_pending");
            var acked = count(stmt, "delivery_acked");
            var dlq = count(stmt, "delivery_dead_lettered");
            var lastCursor = getMeta("last_ack_cursor");
            return Map.of(
                "totalSequences", sequence,
                "pending", pending,
                "acknowledged", acked,
                "deadLettered", dlq,
                "lastAckCursor", lastCursor
            );
        } catch (SQLException e) {
            throw new RuntimeException("getStats failed", e);
        }
    }

    public void close() throws SQLException {
        conn.close();
    }

    private Map<String, String> getPendingEntry(String eventId) {
        try (var stmt = conn.prepareStatement(
                "SELECT * FROM delivery_pending WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                if (!rs.next()) return null;
                var map = new LinkedHashMap<String, String>();
                map.put("cursor", rs.getString("cursor"));
                map.put("subscription_id", rs.getString("subscription_id"));
                map.put("seq", String.valueOf(rs.getInt("seq")));
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
        map.put("sequence", rs.getInt("seq"));
        map.put("cursor", rs.getString("cursor"));
        map.put("attempts", rs.getInt("attempts"));
        map.put("firstAttemptAt", rs.getString("first_attempt_at"));
        map.put("lastAttemptAt", rs.getString("last_attempt_at"));
        return map;
    }

    private int count(Statement stmt, String table) throws SQLException {
        try (var rs = stmt.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }

    private String getMeta(String key) throws SQLException {
        try (var stmt = conn.prepareStatement("SELECT value FROM delivery_meta WHERE key = ?")) {
            stmt.setString(1, key);
            try (var rs = stmt.executeQuery()) {
                return rs.next() ? rs.getString("value") : null;
            }
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add implementations/java/pom.xml implementations/java/src/main/java/com/axisrobo/aep/SqliteDeliveryStore.java
git commit -m "feat: add Java SqliteDeliveryStore"
```

---

### Task 2: SQLite Store Tests

**Files:**
- Create: `implementations/java/src/test/java/com/axisrobo/aep/SqliteDeliveryStoreTest.java`

- [ ] **Step 1: Write failing test**

Create `implementations/java/src/test/java/com/axisrobo/aep/SqliteDeliveryStoreTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.*;
import java.sql.SQLException;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class SqliteDeliveryStoreTest {

    private SqliteDeliveryStore store;

    @BeforeEach
    void setUp() throws SQLException {
        store = new SqliteDeliveryStore("jdbc:sqlite::memory:");
    }

    @AfterEach
    void tearDown() throws SQLException {
        store.close();
    }

    @Test
    void tracksAndAcknowledgesEvents() {
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
        store.track("evt_001", "sub_01");
        var attempts = store.nack("evt_001");
        assertEquals(2, attempts);
        var pending = store.getPending();
        assertEquals(1, pending.size());
        assertEquals(2, pending.get(0).get("attempts"));
    }

    @Test
    void deadLettersExhaustedEvents() {
        store.track("evt_001", "sub_01");
        var dlq = store.deadLetter("evt_001", Map.of("error", Map.of("code", "timeout")));
        assertNotNull(dlq);
        assertEquals("event.dead_lettered", dlq.get("type"));
        assertFalse(store.isPending("evt_001"));
    }

    @Test
    void persistsAcrossTrackerUsage() {
        var tracker = new DeliveryTracker(store, new DeliveryJournal());
        tracker.track("evt_001");
        assertTrue(tracker.isPending("evt_001"));
        tracker.ack("evt_001");
        assertTrue(tracker.isAcknowledged("evt_001"));
    }

    @Test
    void providesStats() {
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
    void getPendingForSubscriptionFilters() {
        store.track("evt_a", "sub_01");
        store.track("evt_b", "sub_02");
        store.track("evt_c", "sub_01");
        var filtered = store.getPendingForSubscription("sub_01");
        assertEquals(2, filtered.size());
    }

    @Test
    void hasAttemptsRemainingChecksMax() {
        store.track("evt_001", "sub_01");
        assertTrue(store.hasAttemptsRemaining("evt_001", 3));
        store.nack("evt_001");
        store.nack("evt_001");
        assertFalse(store.hasAttemptsRemaining("evt_001", 3));
    }
}
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd implementations/java && mvn test -pl . -Dtest=SqliteDeliveryStoreTest -q
```

Expected: FAIL.

- [ ] **Step 3: Run tests after implementation already exists**

```bash
cd implementations/java && mvn test -pl . -Dtest=SqliteDeliveryStoreTest -q
```

Expected: 7 passed.

- [ ] **Step 4: Run all Java tests**

```bash
cd implementations/java && mvn test -q
```

Expected: all pass (~47 tests).

- [ ] **Step 5: Commit**

```bash
git add implementations/java/src/test/java/com/axisrobo/aep/SqliteDeliveryStoreTest.java
git commit -m "test: add Java SqliteDeliveryStore tests"
```

---

### Task 3: Verification And Push

- [ ] **Step 1: Full cross-language verification**

```bash
cd implementations/java && mvn test -q
cd implementations/typescript && npm test && npm run conformance
cd implementations/python && python -m pytest --tb=short -q
cd implementations/go && go test ./aep/ -v
```

- [ ] **Step 2: Push**

```bash
git status --short
git push
```
