package com.axisrobo.harmovela.recovery;

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

    private final DeliveryStore store;
    private final DeliveryJournal journal;

    public DeliveryTracker() {
        this(new InMemoryDeliveryStore(), new DeliveryJournal());
    }

    public DeliveryTracker(DeliveryStore store, DeliveryJournal journal) {
        this.store = store;
        this.journal = journal;
    }

    public int nextSequence() { return store.nextSequence(); }

    public int track(String eventId) { return track(eventId, "_default"); }

    public int track(String eventId, String subscriptionId) {
        var seq = store.track(eventId, subscriptionId);
        journal.append(Map.of("type", "delivery.tracked", "eventId", eventId,
            "subscriptionId", subscriptionId, "sequence", seq));
        return seq;
    }

    public boolean ack(String eventId) { return store.ack(eventId); }
    public Object nack(String eventId) { return store.nack(eventId); }

    public Map<String, Object> deadLetter(String eventId, Map<String, Object> reason) {
        return store.deadLetter(eventId, reason);
    }

    public List<Map<String, Object>> getPending() { return store.getPending(); }

    public List<Map<String, Object>> getPendingForSubscription(String subscriptionId) {
        return store.getPendingForSubscription(subscriptionId);
    }

    public boolean isAcknowledged(String eventId) { return store.isAcknowledged(eventId); }
    public boolean isPending(String eventId) { return store.isPending(eventId); }

    public boolean hasAttemptsRemaining(String eventId, int maxAttempts) {
        return store.hasAttemptsRemaining(eventId, maxAttempts);
    }

    public Map<String, Object> getStats() { return store.getStats(); }
}
