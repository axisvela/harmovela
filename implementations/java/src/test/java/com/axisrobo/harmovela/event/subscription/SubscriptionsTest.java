package com.axisrobo.harmovela.event.subscription;

import com.axisrobo.harmovela.event.subscription.Subscriptions;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SubscriptionsTest {
    @Test
    void matchesType() {
        assertTrue(Subscriptions.matchesType("*", "task.submitted"));
        assertTrue(Subscriptions.matchesType("task.*", "task.submitted"));
        assertFalse(Subscriptions.matchesType("task.*", "memory.updated"));
        assertTrue(Subscriptions.matchesType("task.submitted", "task.submitted"));
        assertFalse(Subscriptions.matchesType("task.submitted", "task.accepted"));
        assertTrue(Subscriptions.matchesType("task.*.done", "task.build.done"));
        assertFalse(Subscriptions.matchesType("task.*.done", "task.build.failed"));
    }

    @Test
    void matchesFilter() {
        var event = java.util.Map.<String, Object>of("type", "task.submitted", "source", "agent:x");
        assertTrue(Subscriptions.matches(java.util.Map.of("types", "task.*"), event));
        assertFalse(Subscriptions.matches(java.util.Map.of("types", "memory.*"), event));
        assertTrue(Subscriptions.matches(java.util.Map.of("types", "task.*", "source", "agent:x"), event));
        assertFalse(Subscriptions.matches(java.util.Map.of("source", "agent:y"), event));
        assertTrue(Subscriptions.matches(java.util.Map.of(), event));
    }
}
