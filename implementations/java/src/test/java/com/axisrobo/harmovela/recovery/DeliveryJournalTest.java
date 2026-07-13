package com.axisrobo.harmovela.recovery;

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
