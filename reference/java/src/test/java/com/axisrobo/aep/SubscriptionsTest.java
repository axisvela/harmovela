package com.axisrobo.aep;

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
}
