package com.axisrobo.harmovela.event.transport;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class RedisTransportTest {

    @Test
    void streamKeyRouting() {
        var t = new RedisTransport("localhost:6379", "aep.events", "aep");
        assertEquals("aep.type.task.progress", t.streamKey(Map.<String, Object>of("type", "task.progress")));
        assertEquals("aep.source.sensor:a", t.streamKey(Map.<String, Object>of("source", "sensor:a")));
        assertEquals("aep.events", t.streamKey(Map.<String, Object>of()));
    }

    @Test
    void consumerGroupFromSession() {
        var t = new RedisTransport();
        assertEquals("aep-sess_01", t.consumerGroup(Map.<String, Object>of("session_id", "sess_01")));
        assertEquals("aep-default", t.consumerGroup(Map.<String, Object>of()));
    }

    @Test
    void entryFields() {
        var t = new RedisTransport();
        var fields = t.entryFields(Map.<String, Object>of(
            "type", "task.submitted", "source", "agent:researcher",
            "session_id", "sess_01", "conversation_id", "conv_01",
            "task_id", "task_01", "correlation_id", "corr_01",
            "causation_id", "evt_001",
            "delivery", Map.of("mode", "at_least_once")
        ));
        assertEquals(9, fields.size());
        assertEquals("task.submitted", fields.get("aep-type"));
        assertEquals("agent:researcher", fields.get("aep-source"));
        assertEquals("sess_01", fields.get("aep-session"));
        assertEquals("conv_01", fields.get("aep-conversation"));
        assertEquals("task_01", fields.get("aep-task"));
        assertEquals("corr_01", fields.get("aep-correlation"));
        assertEquals("evt_001", fields.get("aep-causation"));
        assertEquals("at_least_once", fields.get("aep-delivery-mode"));
        assertTrue(fields.get("body").contains("task_01"));
    }

    @Test
    void constructorDefaults() {
        var t = new RedisTransport();
        assertEquals("localhost:6379", t.getAddr());
        assertEquals("aep.events", t.getStream());
        assertEquals("aep", t.getPrefix());
        assertFalse(t.isRunning());
    }

    @Test
    void customPrefix() {
        var t = new RedisTransport("localhost:6379", "aep.events", "custom");
        assertEquals("custom.type.test", t.streamKey(Map.<String, Object>of("type", "test")));
    }

    @Test
    void startStop() {
        var t = new RedisTransport();
        assertFalse(t.isRunning());
        t.start();
        assertTrue(t.isRunning());
        t.stop();
        assertFalse(t.isRunning());
    }
}
