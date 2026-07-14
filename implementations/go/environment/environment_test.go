package environment

import "testing"

func TestEnvironmentEventTypesIncludesAll4RegistryEntries(t *testing.T) {
	expected := []string{
		"environment.observed",
		"environment.changed",
		"environment.alerted",
		"environment.error",
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
		"environment.observed",
		"environment.changed",
		"environment.alerted",
		"environment.error",
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
