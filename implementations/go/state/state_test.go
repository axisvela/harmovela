package state

import "testing"

func TestStateEventTypesIncludesAllRegistryEntries(t *testing.T) {
	expected := []string{
		"state.snapshot.requested",
		"state.snapshot.ready",
		"state.delta.applied",
		"state.invalidated",
		"freshness.expired",
		"freshness.window.changed",
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
		"state.snapshot.requested",
		"state.snapshot.ready",
		"state.delta.applied",
		"state.invalidated",
		"freshness.expired",
		"freshness.window.changed",
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
