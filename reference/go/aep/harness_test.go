package aep

import (
	"testing"
)

func TestHarnessDeclaresCapabilities(t *testing.T) {
	h := NewHarness()
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "capabilities.requested",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	responses := h.Handle(event)
	if len(responses) == 0 {
		t.Fatal("expected response for capabilities.requested")
	}
	resp := responses[0]
	if resp["type"] != "capabilities.declared" {
		t.Fatalf("expected capabilities.declared, got %v", resp["type"])
	}
}

func TestHarnessCreatesSubscription(t *testing.T) {
	h := NewHarness()
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "subscription.requested",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload": map[string]any{
			"types": []any{"task.*"},
		},
	}
	responses := h.Handle(event)
	resp := responses[0]
	if resp["type"] != "subscription.created" {
		t.Fatalf("expected subscription.created, got %v", resp["type"])
	}
}

func TestHarnessRejectsSubscriptionWithNoFilter(t *testing.T) {
	h := NewHarness()
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "subscription.requested",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	responses := h.Handle(event)
	if len(responses) == 0 {
		t.Fatal("expected rejection response")
	}
	resp := responses[0]
	if resp["type"] != "subscription.rejected" {
		t.Fatalf("expected subscription.rejected, got %v", resp["type"])
	}
}

func TestHarnessSessionOpenAndClose(t *testing.T) {
	h := NewHarness()
	open := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_sess_001",
		"type":        "session.opened",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload": map[string]any{
			"session_id": "sess_01",
			"version":    "0.1",
		},
	}
	responses := h.Handle(open)
	if len(responses) < 2 {
		t.Fatalf("expected at least 2 responses (opened + ready), got %d", len(responses))
	}
	types := make([]string, len(responses))
	for i, r := range responses {
		types[i], _ = r["type"].(string)
	}
	hasOpened := false
	hasReady := false
	for _, typ := range types {
		if typ == "session.opened" {
			hasOpened = true
		}
		if typ == "session.ready" {
			hasReady = true
		}
	}
	if !hasOpened || !hasReady {
		t.Fatalf("expected session.opened and session.ready in %v", types)
	}

	close := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_close_001",
		"type":        "session.closed",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:05:00Z",
		"payload": map[string]any{
			"session_id": "sess_01",
			"reason":     "done",
		},
	}
	responses = h.Handle(close)
	hasClosed := false
	for _, r := range responses {
		typ, _ := r["type"].(string)
		if typ == "session.closed" {
			hasClosed = true
		}
	}
	if !hasClosed {
		t.Fatal("expected session.closed response")
	}
}

func TestHarnessTaskLifecycle(t *testing.T) {
	h := NewHarness()
	submitted := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_task_001",
		"type":        "task.submitted",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"task_id":     "task_01",
		"payload": map[string]any{
			"task_id":     "task_01",
			"description": "crawl example.org",
		},
	}
	responses := h.Handle(submitted)
	resp := responses[0]
	if resp["type"] != "task.accepted" {
		t.Fatalf("expected task.accepted, got %v", resp["type"])
	}

	started := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_task_002",
		"type":        "task.started",
		"source":      "tool:crawl",
		"created_at":  "2026-07-09T10:00:05Z",
		"task_id":     "task_01",
		"payload":     map[string]any{"task_id": "task_01", "state": "started"},
	}
	responses = h.Handle(started)
	hasAck := false
	for _, r := range responses {
		if typ, _ := r["type"].(string); typ == "event.acknowledged" {
			hasAck = true
		}
	}
	if !hasAck {
		t.Fatal("expected event.acknowledged for task.started")
	}

	completed := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_task_005",
		"type":        "task.completed",
		"source":      "tool:crawl",
		"created_at":  "2026-07-09T10:01:00Z",
		"task_id":     "task_01",
		"payload":     map[string]any{"task_id": "task_01", "state": "completed", "result": "done"},
	}
	responses = h.Handle(completed)
	hasCompleted := false
	for _, r := range responses {
		if typ, _ := r["type"].(string); typ == "task.completed" {
			hasCompleted = true
		}
	}
	if !hasCompleted {
		t.Fatal("expected task.completed event")
	}
}

func TestHarnessTaskRejectsUnknownTask(t *testing.T) {
	h := NewHarness()
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "task.progress",
		"source":      "tool:crawl",
		"created_at":  "2026-07-09T10:00:00Z",
		"task_id":     "task_unknown",
		"payload":     map[string]any{"message": "progress"},
	}
	responses := h.Handle(event)
	if len(responses) == 0 {
		t.Fatal("expected rejection for unknown task")
	}
	resp := responses[0]
	if resp["type"] != "event.rejected" {
		t.Fatalf("expected event.rejected, got %v", resp["type"])
	}
}
