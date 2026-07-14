package harness

import "testing"

func TestHarnessBudgetEstablishedAndEnforced(t *testing.T) {
	h := NewHarness()
	tenantID := "tenant-alpha"
	budgetID := "budget-01"

	established := map[string]any{
		"spec_version": "0.2",
		"id":           "evt_adapt_001",
		"type":         "adaptation.budget.established",
		"source":       "agent:budget-manager",
		"created_at":   "2026-07-14T10:00:00Z",
		"tenant_id":    tenantID,
		"actor_id":     "actor_admin",
		"payload": map[string]any{
			"budget_id": budgetID,
			"limit":     100.0,
		},
	}
	responses := h.Handle(established)
	if len(responses) == 0 {
		t.Fatal("expected budget established response")
	}
	if h.BudgetLimits[budgetID] != 100.0 {
		t.Fatalf("expected budget limit 100.0, got %v", h.BudgetLimits[budgetID])
	}

	withinBudget := map[string]any{
		"spec_version": "0.2",
		"id":           "evt_adapt_002",
		"type":         "adaptation.outcome.correlated",
		"source":       "agent:worker",
		"created_at":   "2026-07-14T10:01:00Z",
		"tenant_id":    tenantID,
		"actor_id":     "actor_worker",
		"budget_id":    budgetID,
		"budget_cost":  50.0,
		"payload":      map[string]any{},
	}
	responses = h.Handle(withinBudget)
	hasAck := false
	for _, r := range responses {
		if typ, _ := r["type"].(string); typ == "event.acknowledged" {
			hasAck = true
		}
	}
	if !hasAck {
		t.Fatal("expected event.acknowledged for within-budget operation")
	}

	exceedBudget := map[string]any{
		"spec_version": "0.2",
		"id":           "evt_adapt_003",
		"type":         "adaptation.outcome.correlated",
		"source":       "agent:worker",
		"created_at":   "2026-07-14T10:02:00Z",
		"tenant_id":    tenantID,
		"actor_id":     "actor_worker",
		"budget_id":    budgetID,
		"budget_cost":  200.0,
		"payload":      map[string]any{},
	}
	responses = h.Handle(exceedBudget)
	foundRejected := false
	foundLimitExceeded := false
	for _, r := range responses {
		if typ, _ := r["type"].(string); typ == "event.rejected" {
			foundRejected = true
			payload, _ := r["payload"].(map[string]any)
			if err, ok := payload["error"].(map[string]any); ok {
				if code, _ := err["code"].(string); code != "budget_exceeded" {
					t.Fatalf("expected budget_exceeded error code, got %v", code)
				}
			}
		}
		if typ, _ := r["type"].(string); typ == "adaptation.budget.limit_exceeded" {
			foundLimitExceeded = true
		}
	}
	if !foundRejected {
		t.Fatal("expected event.rejected response")
	}
	if !foundLimitExceeded {
		t.Fatal("expected adaptation.budget.limit_exceeded event")
	}
}
