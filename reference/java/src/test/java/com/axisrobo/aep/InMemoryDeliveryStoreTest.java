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
        assertFalse((Boolean) store.nack("nonexistent"));
    }

    @Test
    void deadLetterReturnsNullForUnknownEvents() {
        var store = new InMemoryDeliveryStore();
        assertNull(store.deadLetter("nonexistent", null));
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