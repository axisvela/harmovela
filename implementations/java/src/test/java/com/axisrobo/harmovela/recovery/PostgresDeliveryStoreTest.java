package com.axisrobo.harmovela.recovery;

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
