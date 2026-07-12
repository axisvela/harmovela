package com.axisrobo.aep.runtime;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class RuntimeSubscriptionsTest {
    private Config noServerConfig() {
        return Config.defaultConfig().withStore("memory").withWebsocketEnabled(false).withSseEnabled(false)
            .withApi(new Config.Transport(false, "127.0.0.1", 0, "/harmovela/api"));
    }

    private Map<String, Object> event(String id, String type) {
        return Map.of("spec_version", "0.2", "id", id, "type", type,
            "source", "t", "created_at", "2026-07-11T10:00:00Z", "payload", Map.of());
    }

    @Test
    void registryBuffersMatchingEvents() {
        var svc = new AepRuntimeService(noServerConfig());
        svc.start();
        var record = svc.createSubscription(Map.of("types", "task.*"));
        var id = (String) record.get("id");
        svc.publish(event("evt_match", "task.submitted"));
        svc.publish(event("evt_skip", "session.opened"));
        var drained = svc.takeEvents(id, 100);
        assertEquals(1, drained.size());
        assertEquals("evt_match", drained.get(0).get("id"));
        svc.stop();
    }

    @Test
    void listsAndDeletes() {
        var svc = new AepRuntimeService(noServerConfig());
        svc.start();
        var record = svc.createSubscription(Map.of("types", "task.*"));
        var id = (String) record.get("id");
        assertEquals(1, svc.listSubscriptions().size());
        assertNotNull(svc.getSubscription(id));
        assertTrue(svc.deleteSubscription(id));
        assertNull(svc.getSubscription(id));
        svc.stop();
    }
}
