package aep

import (
	"testing"
)

func TestValidateEnvelopeAcceptsValid(t *testing.T) {
	event := map[string]any{
		"spec_version": "0.2",
		"id":          "evt_001",
		"type":        "task.submitted",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	errs := ValidateEnvelope(event)
	if len(errs) != 0 {
		t.Fatalf("expected no errors, got %v", errs)
	}
}

func TestValidateEnvelopeRejectsMissingFields(t *testing.T) {
	event := map[string]any{}
	errs := ValidateEnvelope(event)
	if len(errs) == 0 {
		t.Fatal("expected errors for missing fields")
	}
}

func TestValidateEnvelopeRejectsUnknownType(t *testing.T) {
	event := map[string]any{
		"spec_version": "0.2",
		"id":          "evt_001",
		"type":        "not.a.real.type",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	errs := ValidateEnvelope(event)
	if len(errs) == 0 {
		t.Fatal("expected error for unknown type")
	}
}

func TestValidateEnvelopeRejectsUnsupportedVersion(t *testing.T) {
	event := map[string]any{
		"spec_version": "99.9",
		"id":          "evt_001",
		"type":        "task.submitted",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	errs := ValidateEnvelope(event)
	if len(errs) == 0 {
		t.Fatal("expected error for unsupported version")
	}
	found := false
	for _, s := range errs {
		if len(s) >= 9 && s[:9] == "unsupport" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected unsupported version error, got %v", errs)
	}
}
