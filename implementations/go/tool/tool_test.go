package tool

import "testing"

func TestToolEventTypesIncludesAll11RegistryEntries(t *testing.T) {
	expected := []string{
		"tool.call.requested",
		"tool.call.accepted",
		"tool.call.rejected",
		"tool.call.started",
		"tool.call.progress",
		"tool.call.output",
		"tool.call.completed",
		"tool.call.failed",
		"tool.call.cancel.requested",
		"tool.call.cancelled",
		"tool.call.timed_out",
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
		"tool.call.requested",
		"tool.call.accepted",
		"tool.call.started",
		"tool.call.progress",
		"tool.call.completed",
		"tool.call.failed",
		"tool.call.cancelled",
		"tool.call.timed_out",
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
