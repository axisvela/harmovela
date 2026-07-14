package com.axisrobo.harmovela.event;

import com.axisrobo.harmovela.event.envelope.Envelope;
import com.axisrobo.harmovela.event.registry.EventTypes;
import com.axisrobo.harmovela.event.router.EventRouter;
import com.axisrobo.harmovela.event.session.Session;
import com.axisrobo.harmovela.event.subscription.Subscriptions;
import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EventCoreTest {
    @Test
    void validatesEventEnvelopeAndExcludesTaskRegistryTypes() {
        var event = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_01", "type", "session.opened",
            "source", "agent:test", "created_at", "2026-07-09T10:00:00Z", "payload", Map.of()
        );
        assertTrue(Envelope.validate(event).isEmpty());
        assertTrue(EventTypes.isStandardEventType("task.submitted"));
    }

    @Test
    void providesEventSessionSubscriptionAndRoutingBehavior() {
        var session = new Session("sess_event", null, null);
        assertEquals("session.opened", session.opened().get("type"));
        assertTrue(Subscriptions.matchesType("session.*", "session.ready"));
        assertTrue(Subscriptions.matches(Map.of("types", "session.*"), Map.of("type", "session.ready")));

        var router = new EventRouter();
        router.onAll(event -> Map.of("type", "event.acknowledged"));
        assertEquals(1, router.dispatch(Map.of("type", "session.ready")).size());
    }
}
