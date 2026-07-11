package com.axisrobo.aep.transport;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class KafkaTransportTest {

    @Test
    void messageKeyPriority() {
        var t = new KafkaTransport();
        var event = Map.<String, Object>of("task_id", "task_01", "conversation_id", "conv_01", "session_id", "sess_01", "source", "agent:x");
        assertEquals("task_01", t.messageKey(event));
        assertEquals("conv_01", t.messageKey(Map.<String, Object>of("conversation_id", "conv_01", "session_id", "sess_01")));
        assertEquals("sess_01", t.messageKey(Map.<String, Object>of("session_id", "sess_01")));
        assertEquals("agent:researcher", t.messageKey(Map.<String, Object>of("source", "agent:researcher")));
        assertEquals("", t.messageKey(Map.<String, Object>of()));
    }

    @Test
    void targetTopicRouting() {
        var t = new KafkaTransport(List.of("localhost:9092"), "aep.events", "aep");
        assertEquals("aep.type.task.progress", t.targetTopic(Map.<String, Object>of("type", "task.progress")));
        assertEquals("aep.source.sensor:a", t.targetTopic(Map.<String, Object>of("source", "sensor:a")));
        assertEquals("aep.events", t.targetTopic(Map.<String, Object>of()));
    }

    @Test
    void messageHeaders() {
        var t = new KafkaTransport();
        var headers = t.messageHeaders(Map.<String, Object>of(
            "type", "task.submitted", "source", "agent:researcher",
            "session_id", "sess_01", "conversation_id", "conv_01",
            "task_id", "task_01", "correlation_id", "corr_01",
            "causation_id", "evt_001",
            "delivery", Map.of("mode", "at_least_once")
        ));
        assertEquals(8, headers.size());
        assertEquals("task.submitted", headers.get("aep-type"));
        assertEquals("agent:researcher", headers.get("aep-source"));
        assertEquals("sess_01", headers.get("aep-session"));
        assertEquals("conv_01", headers.get("aep-conversation"));
        assertEquals("task_01", headers.get("aep-task"));
        assertEquals("corr_01", headers.get("aep-correlation"));
        assertEquals("evt_001", headers.get("aep-causation"));
        assertEquals("at_least_once", headers.get("aep-delivery-mode"));
    }

    @Test
    void constructorDefaults() {
        var t = new KafkaTransport();
        assertEquals(List.of("localhost:9092"), t.getBrokers());
        assertEquals("aep.events", t.getTopic());
        assertEquals("aep", t.getPrefix());
        assertFalse(t.isRunning());
    }

    @Test
    void customPrefix() {
        var t = new KafkaTransport(List.of("localhost:9092"), "aep.events", "custom");
        assertEquals("custom.type.test", t.targetTopic(Map.<String, Object>of("type", "test")));
    }

    @Test
    void startStop() {
        var t = new KafkaTransport();
        assertFalse(t.isRunning());
        t.start();
        assertTrue(t.isRunning());
        t.stop();
        assertFalse(t.isRunning());
    }
}
