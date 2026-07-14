package command

import "testing"

func TestCommandEventTypesIncludesAllEntries(t *testing.T) {
	expected := []string{
		"command.requested",
		"command.accepted",
		"command.rejected",
		"command.completed",
		"command.failed",
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
		"command.requested",
		"command.accepted",
		"command.rejected",
		"command.completed",
		"command.failed",
	}
	for _, typ := range tests {
		if !IsEventType(typ) {
			t.Errorf("expected true for %s", typ)
		}
	}
}

func TestIsEventTypeNegatives(t *testing.T) {
	tests := []string{
		"task.submitted",
		"session.opened",
		"query.requested",
		"",
	}
	for _, typ := range tests {
		if IsEventType(typ) {
			t.Errorf("expected false for %s", typ)
		}
	}
}
