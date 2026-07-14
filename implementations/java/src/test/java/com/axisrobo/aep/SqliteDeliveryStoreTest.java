package com.axisrobo.aep;

import com.axisrobo.harmovela.recovery.SqliteDeliveryStore;
import com.axisrobo.harmovela.recovery.DeliveryTracker;
import com.axisrobo.harmovela.recovery.DeliveryJournal;
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
