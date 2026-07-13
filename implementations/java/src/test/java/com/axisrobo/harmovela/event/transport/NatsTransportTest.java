package com.axisrobo.harmovela.event.transport;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class NatsTransportTest {

    @Test
    void eventSubjectTopicPriority() {
        var t = new NatsTransport("nats://localhost:4222", "aep");
        var event = Map.<String, Object>of("topic", "tasks.task_01", "type", "task.progress", "source", "agent:x");
        assertEquals("aep.topic.tasks.task_01", t.eventSubject(event));
    }

    @Test
    void eventSubjectByType() {
        var t = new NatsTransport("nats://localhost:4222", "aep");
        assertEquals("aep.type.task.progress", t.eventSubject(Map.of("type", "task.progress")));
    }

    @Test
    void eventSubjectBySource() {
        var t = new NatsTransport();
        assertEquals("aep.source.agent:researcher", t.eventSubject(Map.of("source", "agent:researcher")));
    }

    @Test
    void eventSubjectFallback() {
        var t = new NatsTransport();
        assertEquals("aep.event", t.eventSubject(Map.of()));
    }

    @Test
    void eventSubjectEmptyTypeSkipsToSource() {
        var t = new NatsTransport("nats://localhost:4222", "aep");
        assertEquals("aep.source.agent:monitor", t.eventSubject(Map.of("type", "", "source", "agent:monitor")));
    }

    @Test
    void eventSubjectNullTypeSkipsToSource() {
        var t = new NatsTransport("nats://localhost:4222", "aep");
        var event = new java.util.HashMap<String, Object>();
        event.put("type", null);
        event.put("source", "agent:monitor");
        assertEquals("aep.source.agent:monitor", t.eventSubject(event));
    }

    @Test
    void subscriptionSubjects() {
        var t = new NatsTransport("nats://localhost:4222", "aep");
        var subjects = t.subscriptionSubjects(List.of("task.*", "memory.*"), "sess_01");
        assertEquals(List.of("aep.type.task.>", "aep.type.memory.>", "aep.sess.sess_01"), subjects);
    }

    @Test
    void subscriptionSubjectsWildcard() {
        var t = new NatsTransport();
        assertEquals(List.of("aep.>"), t.subscriptionSubjects(List.of("*"), ""));
    }

    @Test
    void subscriptionSubjectsNullSessionId() {
        var t = new NatsTransport("nats://localhost:4222", "aep");
        var subjects = t.subscriptionSubjects(List.of("task.*"), null);
        assertEquals(List.of("aep.type.task.>"), subjects);
    }

    @Test
    void constructorDefaults() {
        var t = new NatsTransport();
        assertEquals("nats://localhost:4222", t.getUrl());
        assertEquals("aep", t.getPrefix());
        assertFalse(t.isConnected());
    }

    @Test
    void customPrefix() {
        var t = new NatsTransport("nats://localhost:4222", "custom");
        assertEquals("custom.type.test", t.eventSubject(Map.of("type", "test")));
    }

    @Test
    void sendThrowsWhenNotConnected() {
        var t = new NatsTransport();
        assertFalse(t.isConnected());
        assertThrows(IllegalStateException.class, () -> t.send(Map.of("type", "test")));
    }
}
