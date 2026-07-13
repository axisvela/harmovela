package com.axisrobo.harmovela.recovery;

import java.time.Instant;
import java.util.*;

public class InMemoryDeliveryStore implements DeliveryStore {
    private int sequence;
    private final String streamId;
    private final Map<String, Map<String, Object>> pending = new LinkedHashMap<>();
    private final Set<String> acked = new HashSet<>();
    private final Map<String, Map<String, Object>> deadLettered = new LinkedHashMap<>();
    private final Map<String, Map<String, Object>> subscriptions = new LinkedHashMap<>();
    private String lastAckCursor;

    public InMemoryDeliveryStore() {
        this(0, "stream_01");
    }

    public InMemoryDeliveryStore(int startSequence, String streamId) {
        this.sequence = startSequence;
        this.streamId = streamId;
    }

    public int nextSequence() { return ++sequence; }

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
        var payload = new LinkedHashMap<String, Object>();
        payload.put("original_event_id", eventId);
        payload.put("subscription_id", entry.get("subscriptionId"));
        payload.put("cursor", entry.get("cursor"));
        payload.put("attempts", entry.get("attempts"));
        payload.put("last_attempt_at", entry.get("lastAttemptAt"));
        payload.put("error", reason.get("error"));
        return Map.of(
            "type", "event.dead_lettered",
            "payload", payload
        );
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getPending() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (var entry : pending.values()) {
            result.add(new LinkedHashMap<>(entry));
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getPendingForSubscription(String subscriptionId) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (var entry : pending.values()) {
            if (subscriptionId.equals(entry.get("subscriptionId"))) {
                result.add(new LinkedHashMap<>(entry));
            }
        }
        return result;
    }

    public List<Map<String, Object>> getDeadLettered() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (var entry : deadLettered.values()) {
            var record = new LinkedHashMap<String, Object>();
            record.put("eventId", entry.get("eventId"));
            record.put("subscriptionId", entry.get("subscriptionId"));
            record.put("reason", entry.get("reason"));
            result.add(record);
        }
        return result;
    }

    public boolean isAcknowledged(String eventId) { return acked.contains(eventId); }

    public Map<String, Object> createSubscription(Map<String, Object> record) {
        subscriptions.put((String) record.get("id"), record);
        return record;
    }

    public Map<String, Object> getSubscription(String id) {
        return subscriptions.get(id);
    }

    public List<Map<String, Object>> listSubscriptions() {
        return new ArrayList<>(subscriptions.values());
    }

    public boolean deleteSubscription(String id) {
        return subscriptions.remove(id) != null;
    }
    public boolean isPending(String eventId) { return pending.containsKey(eventId); }

    public boolean hasAttemptsRemaining(String eventId, int maxAttempts) {
        var entry = pending.get(eventId);
        if (entry == null) return false;
        return (int) entry.get("attempts") < maxAttempts;
    }

    public Map<String, Object> getStats() {
        var stats = new LinkedHashMap<String, Object>();
        stats.put("totalSequences", sequence);
        stats.put("pending", pending.size());
        stats.put("acknowledged", acked.size());
        stats.put("deadLettered", deadLettered.size());
        stats.put("lastAckCursor", lastAckCursor);
        return stats;
    }
}
