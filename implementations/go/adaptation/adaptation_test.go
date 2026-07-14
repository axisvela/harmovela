package adaptation

import "testing"

func TestAdaptationEventTypesIncludesAll10RegistryEntries(t *testing.T) {
	expected := []string{
		"adaptation.outcome.correlated",
		"adaptation.goal.created",
		"adaptation.goal.updated",
		"adaptation.goal.achieved",
		"adaptation.goal.abandoned",
		"adaptation.cost.exceeded",
		"adaptation.budget.established",
		"adaptation.budget.adjusted",
		"adaptation.budget.limit_exceeded",
		"adaptation.budget.exhausted",
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
		"adaptation.outcome.correlated",
		"adaptation.goal.created",
		"adaptation.goal.updated",
		"adaptation.goal.achieved",
		"adaptation.goal.abandoned",
		"adaptation.cost.exceeded",
		"adaptation.budget.established",
		"adaptation.budget.adjusted",
		"adaptation.budget.limit_exceeded",
		"adaptation.budget.exhausted",
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
