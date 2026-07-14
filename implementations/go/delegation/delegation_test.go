package delegation

import "testing"

func TestDelegationEventTypesIncludesAll5RegistryEntries(t *testing.T) {
	expected := []string{
		"delegation.requested",
		"delegation.accepted",
		"delegation.rejected",
		"delegation.handoff.completed",
		"delegation.escalated",
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
		"delegation.requested",
		"delegation.accepted",
		"delegation.handoff.completed",
		"delegation.escalated",
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
