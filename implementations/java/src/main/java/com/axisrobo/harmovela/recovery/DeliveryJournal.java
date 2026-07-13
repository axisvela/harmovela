package com.axisrobo.harmovela.recovery;

import java.time.Instant;
import java.util.*;

public class DeliveryJournal {
    private final String streamId;
    private final List<Map<String, Object>> events = new ArrayList<>();
    private int sequence;

    public DeliveryJournal() { this("stream_01"); }

    public DeliveryJournal(String streamId) { this.streamId = streamId; }

    public int nextSequence() { return ++sequence; }

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
        return events.stream().filter(e -> (int) e.get("_journal_sequence") > sinceSeq).toList();
    }

    public List<Map<String, Object>> replaySinceSequence(int seq) {
        return events.stream().filter(e -> (int) e.get("_journal_sequence") > seq).toList();
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
        var stats = new LinkedHashMap<String, Object>();
        stats.put("totalEvents", events.size());
        stats.put("oldestSequence", events.isEmpty() ? null : events.get(0).get("_journal_sequence"));
        stats.put("newestSequence", events.isEmpty() ? null : events.get(events.size() - 1).get("_journal_sequence"));
        return stats;
    }
}
