package agent

import "testing"

func TestAgentEventTypesIncludesAll6RegistryEntries(t *testing.T) {
	expected := []string{
		"agent.message.sent",
		"agent.message.received",
		"agent.message.failed",
		"agent.request.created",
		"agent.response.created",
		"agent.decision.recorded",
	}
	for _, typ := range expected {
		if !EventTypes[typ] {
			t.Errorf("missing: %s", typ)
		}
	}
	if len(EventTypes) != len(expected) {
		t.Errorf("expected %d types, got %d", len(expected), len(EventTypes))
	}
}

func TestIsEventTypePositives(t *testing.T) {
	for _, typ := range []string{
		"agent.message.sent",
		"agent.message.received",
		"agent.message.failed",
		"agent.request.created",
		"agent.response.created",
		"agent.decision.recorded",
	} {
		if !IsEventType(typ) {
			t.Errorf("expected true for %s", typ)
		}
	}
}

func TestIsEventTypeNegatives(t *testing.T) {
	for _, typ := range []string{
		"task.submitted",
		"session.opened",
		"context.updated",
		"",
	} {
		if IsEventType(typ) {
			t.Errorf("expected false for %s", typ)
		}
	}
}
