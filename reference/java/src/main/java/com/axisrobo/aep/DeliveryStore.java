package com.axisrobo.aep;

import java.util.List;
import java.util.Map;

interface DeliveryStore {
    int nextSequence();
    int track(String eventId, String subscriptionId);
    boolean ack(String eventId);
    Object nack(String eventId);
    Map<String, Object> deadLetter(String eventId, Map<String, Object> reason);
    List<Map<String, Object>> getPending();
    List<Map<String, Object>> getPendingForSubscription(String subscriptionId);
    boolean isAcknowledged(String eventId);
    boolean isPending(String eventId);
    boolean hasAttemptsRemaining(String eventId, int maxAttempts);
    Map<String, Object> getStats();
}
