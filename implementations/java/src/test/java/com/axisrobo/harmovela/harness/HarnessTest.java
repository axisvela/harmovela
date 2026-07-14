package com.axisrobo.harmovela.harness;

import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class HarnessTest {

    @Test
    void declaresCapabilities() {
        var h = new Harness();
        var event = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_001",
            "type", "capabilities.requested", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z", "payload", Map.of()
        );
        var responses = h.handle(event);
        assertEquals("capabilities.declared", responses.get(0).get("type"));
    }

    @Test
    void createsSubscription() {
        var h = new Harness();
        var event = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_001",
            "type", "subscription.requested", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of("types", List.of("task.*"))
        );
        var responses = h.handle(event);
        assertEquals("subscription.created", responses.get(0).get("type"));
    }

    @Test
    void rejectsSubscriptionWithNoFilter() {
        var h = new Harness();
        var event = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_001",
            "type", "subscription.requested", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z", "payload", Map.of()
        );
        var responses = h.handle(event);
        assertEquals("subscription.rejected", responses.get(0).get("type"));
    }

    @Test
    void sessionOpenAndClose() {
        var h = new Harness();
        var open = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_sess_001",
            "type", "session.opened", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of("session_id", "sess_01", "version", "0.2")
        );
        var responses = h.handle(open);
        assertTrue(responses.size() >= 2);
        var types = responses.stream().map(r -> (String) r.get("type")).toList();
        assertTrue(types.contains("session.opened"));
        assertTrue(types.contains("session.ready"));

        var close = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_close_001",
            "type", "session.closed", "source", "agent:test",
            "created_at", "2026-07-09T10:05:00Z",
            "payload", Map.of("session_id", "sess_01", "reason", "done")
        );
        responses = h.handle(close);
        assertTrue(responses.stream().anyMatch(r -> "session.closed".equals(r.get("type"))));
    }

    @Test
    void taskLifecycle() {
        var h = new Harness();
        var submitted = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_task_001",
            "type", "task.submitted", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "task_id", "task_01",
            "payload", Map.of("task_id", "task_01", "description", "crawl")
        );
        var responses = h.handle(submitted);
        assertEquals("task.accepted", responses.get(0).get("type"));

        var started = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_task_002",
            "type", "task.started", "source", "tool:crawl",
            "created_at", "2026-07-09T10:00:05Z",
            "task_id", "task_01",
            "payload", Map.of("task_id", "task_01", "state", "started")
        );
        responses = h.handle(started);
        assertTrue(responses.stream().anyMatch(r -> "event.acknowledged".equals(r.get("type"))));

        var completed = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_task_005",
            "type", "task.completed", "source", "tool:crawl",
            "created_at", "2026-07-09T10:01:00Z",
            "task_id", "task_01",
            "payload", Map.of("task_id", "task_01", "state", "completed", "result", "done")
        );
        responses = h.handle(completed);
        assertTrue(responses.stream().anyMatch(r -> "task.completed".equals(r.get("type"))));
    }

    @Test
    void rejectsUnknownTask() {
        var h = new Harness();
        var event = Map.<String, Object>of(
            "spec_version", "0.2", "id", "evt_001",
            "type", "task.progress", "source", "tool:crawl",
            "created_at", "2026-07-09T10:00:00Z",
            "task_id", "task_unknown",
            "payload", Map.of("message", "progress")
        );
        var responses = h.handle(event);
        assertEquals("event.rejected", responses.get(0).get("type"));
    }
}
