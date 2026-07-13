package event

import "testing"

func TestEventPublicAPI(t *testing.T) {
	event := map[string]any{
		"spec_version": "0.2",
		"id":           "evt_01",
		"type":         "session.opened",
		"source":       "agent:test",
		"created_at":   "2026-07-09T10:00:00Z",
		"payload":      map[string]any{},
	}
	if errors := ValidateEnvelope(event); len(errors) != 0 {
		t.Fatalf("expected valid Event envelope, got %v", errors)
	}
	if IsStandardEventType("task.submitted") {
		t.Fatal("Task types must not be Event registry entries")
	}
}

func TestEventSessionSubscriptionAndRouter(t *testing.T) {
	session := NewHarmovelaSession("sess_event", "", "")
	if opened, err := session.Opened(); err != nil || opened["type"] != "session.opened" {
		t.Fatalf("expected opened Event session, got %v, %v", opened, err)
	}
	if !MatchesType("session.*", "session.ready") {
		t.Fatal("expected Event subscription pattern match")
	}
	if !SubscriptionMatches(map[string]any{"types": "session.*"}, map[string]any{"type": "session.ready"}) {
		t.Fatal("expected Event subscription match")
	}
	router := NewEventRouter()
	router.OnAll(func(event map[string]any) any { return map[string]any{"type": "event.acknowledged"} })
	if len(router.Dispatch(map[string]any{"type": "session.ready"})) != 1 {
		t.Fatal("expected routed Event response")
	}
}
