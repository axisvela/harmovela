package recovery

import "testing"

func TestRecoveryEventTypesIncludesAll7RegistryEntries(t *testing.T) {
	expected := []string{
		"interruption.requested",
		"interruption.acknowledged",
		"interruption.saved",
		"interruption.resumed",
		"interruption.cancelled",
		"compensation.requested",
		"compensation.completed",
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

func TestIsRecoveryEventTypePositives(t *testing.T) {
	for _, typ := range []string{
		"interruption.requested",
		"interruption.acknowledged",
		"interruption.saved",
		"interruption.resumed",
		"interruption.cancelled",
		"compensation.requested",
		"compensation.completed",
	} {
		if !IsEventType(typ) {
			t.Errorf("expected true for %s", typ)
		}
	}
}

func TestIsRecoveryEventTypeNegatives(t *testing.T) {
	for _, typ := range []string{
		"task.submitted",
		"session.opened",
		"delegation.requested",
		"",
	} {
		if IsEventType(typ) {
			t.Errorf("expected false for %s", typ)
		}
	}
}
