package context

import "testing"

func TestContextMemoryEventTypesIncludesAll15RegistryEntries(t *testing.T) {
	expected := []string{
		"context.updated",
		"context.invalidated",
		"context.snapshot.requested",
		"context.snapshot.ready",
		"context.retrieval.started",
		"context.retrieval.completed",
		"context.retrieval.failed",
		"memory.fact.added",
		"memory.fact.updated",
		"memory.fact.invalidated",
		"memory.episode.stored",
		"memory.preference.updated",
		"memory.constraint.updated",
		"memory.summary.ready",
		"memory.retrieval.ready",
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
		"context.updated",
		"context.invalidated",
		"memory.fact.added",
		"memory.retrieval.ready",
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
		"state.delta.applied",
		"",
	} {
		if IsEventType(typ) {
			t.Errorf("expected false for %s", typ)
		}
	}
}
