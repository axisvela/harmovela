package capability

import "testing"

func TestCapabilityEventTypesIncludesAllEntries(t *testing.T) {
	expected := []string{
		"capability.registered",
		"capability.updated",
		"capability.deprecated",
		"capability.composed",
		"capability.validated",
	}
	for _, typ := range expected {
		if !EventTypes[typ] {
			t.Errorf("missing: %s", typ)
		}
	}
	if len(EventTypes) != len(expected) {
		t.Errorf("size mismatch: got %d, want %d", len(EventTypes), len(expected))
	}
}

func TestIsEventTypePositives(t *testing.T) {
	tests := []string{
		"capability.registered",
		"capability.updated",
		"capability.deprecated",
		"capability.composed",
		"capability.validated",
	}
	for _, typ := range tests {
		if !IsEventType(typ) {
			t.Errorf("expected true for %s", typ)
		}
	}
}

func TestIsEventTypeNegatives(t *testing.T) {
	tests := []string{
		"capabilities.requested",
		"task.submitted",
		"command.requested",
		"",
	}
	for _, typ := range tests {
		if IsEventType(typ) {
			t.Errorf("expected false for %s", typ)
		}
	}
}
