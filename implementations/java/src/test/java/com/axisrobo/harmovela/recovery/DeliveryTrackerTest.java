package com.axisrobo.harmovela.recovery;

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
        assertEquals(2, journal.getStats().get("totalEvents"));
        var stats = tracker.getStats();
        assertEquals(0, stats.get("pending"));
        assertEquals(1, stats.get("acknowledged"));
    }
}
