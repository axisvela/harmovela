package aep

import (
	"slices"
	"testing"
)

func TestValidateEnvelopeAcceptsValid(t *testing.T) {
	event := map[string]any{
		"aep_version": "0.1",
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
		"aep_version": "0.1",
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
		"aep_version": "99.9",
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
	hasVersion := slices.ContainsFunc(errs, func(s string) bool {
		return len(s) > 0 && (s[0:7] == "unsuppo" || s[0:4] == "aep_")
	})
	if !hasVersion {
		t.Logf("errors: %v", errs)
	}
}
