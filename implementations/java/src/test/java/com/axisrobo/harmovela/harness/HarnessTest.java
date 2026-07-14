package com.axisrobo.harmovela.harness;

import com.axisrobo.harmovela.event.Errors;
import org.junit.jupiter.api.Test;
import java.util.LinkedHashMap;
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

    @Test
    void budgetEstablishedAndEnforced() {
        var h = new Harness();
        var tenantId = "tenant-alpha";
        var budgetId = "budget-01";

        var established = new LinkedHashMap<String, Object>();
        established.put("spec_version", "0.2");
        established.put("id", "evt_adapt_001");
        established.put("type", "adaptation.budget.established");
        established.put("source", "agent:budget-manager");
        established.put("created_at", "2026-07-14T10:00:00Z");
        established.put("tenant_id", tenantId);
        established.put("actor_id", "actor_admin");
        established.put("payload", Map.of("budget_id", budgetId, "limit", 100.0));

        var responses = h.handle(established);
        assertNotNull(responses);

        var withinBudget = new LinkedHashMap<String, Object>();
        withinBudget.put("spec_version", "0.2");
        withinBudget.put("id", "evt_adapt_002");
        withinBudget.put("type", "adaptation.outcome.correlated");
        withinBudget.put("source", "agent:worker");
        withinBudget.put("created_at", "2026-07-14T10:01:00Z");
        withinBudget.put("tenant_id", tenantId);
        withinBudget.put("actor_id", "actor_worker");
        withinBudget.put("budget_id", budgetId);
        withinBudget.put("budget_cost", 50.0);
        withinBudget.put("payload", Map.of());

        responses = h.handle(withinBudget);
        assertFalse(responses.isEmpty());

        var exceedBudget = new LinkedHashMap<String, Object>();
        exceedBudget.put("spec_version", "0.2");
        exceedBudget.put("id", "evt_adapt_003");
        exceedBudget.put("type", "adaptation.outcome.correlated");
        exceedBudget.put("source", "agent:worker");
        exceedBudget.put("created_at", "2026-07-14T10:02:00Z");
        exceedBudget.put("tenant_id", tenantId);
        exceedBudget.put("actor_id", "actor_worker");
        exceedBudget.put("budget_id", budgetId);
        exceedBudget.put("budget_cost", 200.0);
        exceedBudget.put("payload", Map.of());

        responses = h.handle(exceedBudget);
        var rejected = responses.stream()
            .filter(r -> "event.rejected".equals(r.get("type")))
            .findFirst();
        assertTrue(rejected.isPresent());
        @SuppressWarnings("unchecked")
        var rejPayload = (Map<String, Object>) rejected.get().get("payload");
        assertNotNull(rejPayload);
        @SuppressWarnings("unchecked")
        var rejError = (Map<String, Object>) rejPayload.get("error");
        assertEquals(Errors.BUDGET_EXCEEDED, rejError.get("code"));

        var limitExceeded = responses.stream()
            .filter(r -> "adaptation.budget.limit_exceeded".equals(r.get("type")))
            .findFirst();
        assertTrue(limitExceeded.isPresent());
    }
}
