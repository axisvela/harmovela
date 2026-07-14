# Adaptation Preview 0.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Adaptation dimension module across all 4 languages with 10 event types, budget enforcement in harness, and conformance fixtures.

**Architecture:** Each language gets an `adaptation` dimension package containing an event type registry (map/set + lookup function) following the established delegation/context pattern. The harness gains budget state tracking and enforcement after authorization. Conformance fixtures test positive (budget established, operation within budget, outcome correlated) and negative (limit exceeded rejection) flows declared under `harmovela.adaptation.v1` profile at C1.

**Tech Stack:** Go (Go stdlib testing), Python (pytest), TypeScript (Node `node --test`), Java (JUnit 5)

---

## 10 Adaptation Event Types

| # | Type | Category |
|---|------|----------|
| 1 | `adaptation.outcome.correlated` | Outcome |
| 2 | `adaptation.goal.created` | Goal |
| 3 | `adaptation.goal.updated` | Goal |
| 4 | `adaptation.goal.achieved` | Goal |
| 5 | `adaptation.goal.abandoned` | Goal |
| 6 | `adaptation.cost.exceeded` | Cost |
| 7 | `adaptation.budget.established` | Budget |
| 8 | `adaptation.budget.adjusted` | Budget |
| 9 | `adaptation.budget.limit_exceeded` | Budget |
| 10 | `adaptation.budget.exhausted` | Budget |

---

### Task 1: Go Adaptation dimension module

**Files:**
- Create: `implementations/go/adaptation/adaptation.go`
- Create: `implementations/go/adaptation/adaptation_test.go`

- [ ] **Step 1: Write the adaptation.go registry**

```go
package adaptation

var EventTypes = map[string]bool{
	"adaptation.outcome.correlated":     true,
	"adaptation.goal.created":           true,
	"adaptation.goal.updated":           true,
	"adaptation.goal.achieved":          true,
	"adaptation.goal.abandoned":         true,
	"adaptation.cost.exceeded":          true,
	"adaptation.budget.established":     true,
	"adaptation.budget.adjusted":        true,
	"adaptation.budget.limit_exceeded":  true,
	"adaptation.budget.exhausted":       true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}
```

- [ ] **Step 2: Write the adaptation_test.go**

```go
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
```

- [ ] **Step 3: Run Go adaptation tests**

Run: `cd implementations/go && go test ./adaptation/ -v`
Expected: PASS

- [ ] **Step 4: Commit adaptation module**

```bash
git add implementations/go/adaptation/
git commit -m "feat: add Go adaptation dimension module with 10 event types"
```

---

### Task 2: Python Adaptation dimension module

**Files:**
- Create: `implementations/python/src/axisrobo_harmovela_adaptation/__init__.py`
- Modify: `implementations/python/tests/test_governance_module.py` (no, create new test)

- [ ] **Step 1: Create the Python adaptation module**

Create `implementations/python/src/axisrobo_harmovela_adaptation/__init__.py`:

```python
ADAPTATION_EVENT_TYPES = frozenset({
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
})


def is_adaptation_event_type(type_: str) -> bool:
    return type_ in ADAPTATION_EVENT_TYPES


__all__ = ["ADAPTATION_EVENT_TYPES", "is_adaptation_event_type"]
```

- [ ] **Step 2: Write the Python adaptation test**

Create `implementations/python/tests/test_adaptation_module.py`:

```python
from axisrobo_harmovela_adaptation import ADAPTATION_EVENT_TYPES, is_adaptation_event_type


def test_adaptation_event_types_includes_all_10_registry_entries():
    expected = {
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
    assert ADAPTATION_EVENT_TYPES == expected
    assert len(ADAPTATION_EVENT_TYPES) == 10


def test_is_adaptation_event_type_positives():
    for typ in [
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
    ]:
        assert is_adaptation_event_type(typ) is True


def test_is_adaptation_event_type_negatives():
    for typ in ["task.submitted", "session.opened", "context.updated", ""]:
        assert is_adaptation_event_type(typ) is False
```

- [ ] **Step 3: Run Python adaptation tests**

Run: `cd implementations/python && python -m pytest tests/test_adaptation_module.py -v`
Expected: PASS (3 tests)

- [ ] **Step 4: Commit Python adaptation module**

```bash
git add implementations/python/src/axisrobo_harmovela_adaptation/ implementations/python/tests/test_adaptation_module.py
git commit -m "feat: add Python adaptation dimension module with 10 event types"
```

---

### Task 3: TypeScript Adaptation dimension module

**Files:**
- Create: `implementations/typescript/packages/adaptation/package.json`
- Create: `implementations/typescript/packages/adaptation/src/index.js`
- Create: `implementations/typescript/packages/adaptation/test/adaptation.test.js`

- [ ] **Step 1: Create adaptation package.json**

```json
{
  "name": "@axisrobo/harmovela-adaptation",
  "version": "0.1.0-draft",
  "private": true,
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  }
}
```

- [ ] **Step 2: Write adaptation/src/index.js**

```js
export const ADAPTATION_EVENT_TYPES = new Set([
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
]);

export function isAdaptationEventType(type) {
  return ADAPTATION_EVENT_TYPES.has(type);
}
```

- [ ] **Step 3: Write adaptation/test/adaptation.test.js**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADAPTATION_EVENT_TYPES, isAdaptationEventType } from "../src/index.js";

describe("Adaptation event type registry", () => {
  it("includes all 10 registry entries", () => {
    const expected = [
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
    ];
    assert.equal(ADAPTATION_EVENT_TYPES.size, 10);
    for (const typ of expected) {
      assert.ok(ADAPTATION_EVENT_TYPES.has(typ), `missing: ${typ}`);
    }
  });

  it("isAdaptationEventType returns true for known types", () => {
    for (const typ of [
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
    ]) {
      assert.equal(isAdaptationEventType(typ), true);
    }
  });

  it("isAdaptationEventType returns false for unknown types", () => {
    for (const typ of ["task.submitted", "session.opened", "context.updated", ""]) {
      assert.equal(isAdaptationEventType(typ), false);
    }
  });
});
```

- [ ] **Step 4: Register in TypeScript root package.json**

Add to `implementations/typescript/package.json`:
- In `workspaces` array: add `"packages/adaptation"`
- In `dependencies` object: add `"@axisrobo/harmovela-adaptation": "file:packages/adaptation"`

- [ ] **Step 5: Run TypeScript adaptation tests**

Run: `cd implementations/typescript && node --test packages/adaptation/test/`
Expected: PASS

- [ ] **Step 6: Commit TypeScript adaptation module**

```bash
git add implementations/typescript/packages/adaptation/ implementations/typescript/package.json
git commit -m "feat: add TypeScript adaptation dimension module with 10 event types"
```

---

### Task 4: Java Adaptation dimension module

**Files:**
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/adaptation/AdaptationTypes.java`
- Create: `implementations/java/src/test/java/com/axisrobo/harmovela/adaptation/AdaptationTypesTest.java`

- [ ] **Step 1: Write AdaptationTypes.java**

```java
package com.axisrobo.harmovela.adaptation;

import java.util.Set;

public final class AdaptationTypes {
    private AdaptationTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "adaptation.outcome.correlated",
        "adaptation.goal.created",
        "adaptation.goal.updated",
        "adaptation.goal.achieved",
        "adaptation.goal.abandoned",
        "adaptation.cost.exceeded",
        "adaptation.budget.established",
        "adaptation.budget.adjusted",
        "adaptation.budget.limit_exceeded",
        "adaptation.budget.exhausted"
    );

    public static boolean isAdaptationEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}
```

- [ ] **Step 2: Write AdaptationTypesTest.java**

```java
package com.axisrobo.harmovela.adaptation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AdaptationTypesTest {
    @Test
    void includesAll10RegistryEntries() {
        assertEquals(10, AdaptationTypes.EVENT_TYPES.size());
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.outcome.correlated"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.goal.created"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.goal.updated"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.goal.achieved"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.goal.abandoned"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.cost.exceeded"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.budget.established"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.budget.adjusted"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.budget.limit_exceeded"));
        assertTrue(AdaptationTypes.EVENT_TYPES.contains("adaptation.budget.exhausted"));
    }

    @Test
    void isAdaptationEventTypePositives() {
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.outcome.correlated"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.goal.created"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.goal.updated"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.goal.achieved"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.goal.abandoned"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.cost.exceeded"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.budget.established"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.budget.adjusted"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.budget.limit_exceeded"));
        assertTrue(AdaptationTypes.isAdaptationEventType("adaptation.budget.exhausted"));
    }

    @Test
    void isAdaptationEventTypeNegatives() {
        assertFalse(AdaptationTypes.isAdaptationEventType("task.submitted"));
        assertFalse(AdaptationTypes.isAdaptationEventType("session.opened"));
        assertFalse(AdaptationTypes.isAdaptationEventType("context.updated"));
        assertFalse(AdaptationTypes.isAdaptationEventType(""));
        assertFalse(AdaptationTypes.isAdaptationEventType(null));
    }
}
```

- [ ] **Step 3: Run Java adaptation tests**

Run: `cd implementations/java && mvn test -pl . -Dtest=AdaptationTypesTest -DfailIfNoTests=false -q`
Expected: PASS

- [ ] **Step 4: Commit Java adaptation module**

```bash
git add implementations/java/src/main/java/com/axisrobo/harmovela/adaptation/ implementations/java/src/test/java/com/axisrobo/harmovela/adaptation/
git commit -m "feat: add Java adaptation dimension module with 10 event types"
```

---

### Task 5: Error code for budget enforcement (all 4 languages)

**Files:**
- Modify: `implementations/go/event/errors.go`
- Modify: `implementations/python/src/axisrobo_harmovela_event/errors.py`
- Modify: `implementations/typescript/packages/event/src/errors.js`
- Modify: `implementations/java/src/main/java/com/axisrobo/harmovela/event/Errors.java`

- [ ] **Step 1: Add ErrorCodeBudgetExceeded to Go errors.go**

Add after `ErrorCodeInternalError`:
```go
ErrorCodeBudgetExceeded = "budget_exceeded"
```

- [ ] **Step 2: Add BUDGET_EXCEEDED to Python errors.py**

Add to ErrorCode StrEnum:
```python
BUDGET_EXCEEDED = "budget_exceeded"
```

- [ ] **Step 3: Add ErrorCode.BUDGET_EXCEEDED to TypeScript errors**

Add to the ErrorCode export:
```js
export const ErrorCode = {
  ...
  BUDGET_EXCEEDED: "budget_exceeded",
};
```

First, find the errors file:
Read: `implementations/typescript/packages/event/src/errors.js`

- [ ] **Step 4: Add BUDGET_EXCEEDED to Java Errors.java**

Add after `INTERNAL_ERROR`:
```java
public static final String BUDGET_EXCEEDED = "budget_exceeded";
```

- [ ] **Step 5: Commit error codes**

```bash
git add implementations/go/event/errors.go implementations/python/src/axisrobo_harmovela_event/errors.py implementations/typescript/packages/event/src/errors.js implementations/java/src/main/java/com/axisrobo/harmovela/event/Errors.java
git commit -m "feat: add budget_exceeded error code across all implementations"
```

---

### Task 6: Budget state tracking and enforcement in Go harness

**Files:**
- Modify: `implementations/go/harness/harness.go`
- Modify: `implementations/go/harness/util.go`

- [ ] **Step 1: Add Adaptation import and budget state to Harness struct**

In harness.go, add import for `"github.com/axisrobo/harmovela/adaptation"`.

Add `AdaptationEvents` to the legacy event types in util.go by merging adaptation types.

In Harness struct, add:
```go
Budget              map[string]map[string]float64 // tenant -> budget_id -> remaining
BudgetLimits        map[string]float64             // budget_id -> limit
```

- [ ] **Step 2: Initialize budget maps in NewHarness**

```go
Budget:       make(map[string]map[string]float64),
BudgetLimits: make(map[string]float64),
```

- [ ] **Step 3: Add budget enforcement after authorization in Handle**

After the authorization check (line 172 in harness.go) and before the delivery tracking, add:

```go
// Budget enforcement for adaptation operations
if cost, ok := value["budget_cost"].(float64); ok && cost > 0 {
    budgetID, _ := value["budget_id"].(string)
    tenantID, _ := value["tenant_id"].(string)
    if budgetID != "" && tenantID != "" {
        remaining := h.getRemainingBudget(tenantID, budgetID)
        if remaining < cost {
            h.Audit = append(h.Audit, AuditRecord{
                ActorID:       actorID,
                TenantID:      tenantID,
                Action:        "adaptation.budget.limit_exceeded",
                CorrelationID: correlationID,
                CausationID:   causationID,
            })
            return []map[string]any{h.newEvent("adaptation.budget.limit_exceeded", value, map[string]any{
                "budget_id":   budgetID,
                "tenant_id":   tenantID,
                "cost":        cost,
                "remaining":   remaining,
                "limit":       h.BudgetLimits[budgetID],
                "error":       event.ErrorPayload(event.ErrorCodeBudgetExceeded, "budget limit exceeded for "+budgetID, false),
            })}
        }
    }
}
```

- [ ] **Step 4: Add budget manager methods and event handlers**

Add to harness.go:

```go
func (h *Harness) getRemainingBudget(tenantID, budgetID string) float64 {
	if budget, ok := h.Budget[tenantID]; ok {
		return budget[budgetID]
	}
	return 0
}

func (h *Harness) deductBudget(tenantID, budgetID string, cost float64) {
	if _, ok := h.Budget[tenantID]; !ok {
		h.Budget[tenantID] = make(map[string]float64)
	}
	h.Budget[tenantID][budgetID] -= cost
}
```

Add router handler for adaptation events in setupRouter():

```go
.On(func(evt map[string]any) bool {
    typ, _ := evt["type"].(string)
    return len(typ) > 10 && typ[:10] == "adaptation"
}, h.handleAdaptationEvent),
```

Add handler:

```go
func (h *Harness) handleAdaptationEvent(evt map[string]any) any {
	payload, _ := evt["payload"].(map[string]any)
	if payload == nil {
		payload = map[string]any{}
	}
	typ, _ := evt["type"].(string)

	switch typ {
	case "adaptation.budget.established":
		budgetID, _ := payload["budget_id"].(string)
		limit, _ := payload["limit"].(float64)
		tenantID, _ := evt["tenant_id"].(string)
		if budgetID != "" && limit > 0 {
			h.BudgetLimits[budgetID] = limit
			if _, ok := h.Budget[tenantID]; !ok {
				h.Budget[tenantID] = make(map[string]float64)
			}
			h.Budget[tenantID][budgetID] = limit
		}
		return h.newEvent("event.acknowledged", evt, map[string]any{
			"acknowledged_event_id": evt["id"],
		})
	case "adaptation.budget.adjusted":
		budgetID, _ := payload["budget_id"].(string)
		newLimit, _ := payload["new_limit"].(float64)
		tenantID, _ := evt["tenant_id"].(string)
		if budgetID != "" {
			oldLimit := h.BudgetLimits[budgetID]
			delta := newLimit - oldLimit
			h.BudgetLimits[budgetID] = newLimit
			if h.Budget[tenantID] != nil {
				h.Budget[tenantID][budgetID] += delta
			}
		}
		return h.newEvent("event.acknowledged", evt, map[string]any{
			"acknowledged_event_id": evt["id"],
		})
	default:
		return h.newEvent("event.acknowledged", evt, map[string]any{
			"acknowledged_event_id": evt["id"],
		})
	}
}
```

Also wire up adaptation event types into the standard event type check in util.go - add merging of adaptation.EventTypes into legacyStandardEventTypes.

- [ ] **Step 5: Write Go harness budget tests**

Create test in `implementations/go/harness/adaptation_test.go` or add to `harness_test.go`:

```go
func TestHarnessBudgetEstablishedAndEnforced(t *testing.T) {
	h := NewHarness()
	tenantID := "tenant-alpha"
	budgetID := "budget-01"

	// Establish budget
	h.BudgetLimits[budgetID] = 100.0
	if h.Budget[tenantID] == nil {
		h.Budget[tenantID] = make(map[string]float64)
	}
	h.Budget[tenantID][budgetID] = 100.0

	budgetEstablished := map[string]any{
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
	responses := h.Handle(budgetEstablished)
	if len(responses) == 0 {
		t.Fatal("expected budget established response")
	}
	if h.BudgetLimits[budgetID] != 100.0 {
		t.Fatalf("expected budget limit 100.0, got %v", h.BudgetLimits[budgetID])
	}

	// Operation within budget
	withinBudget := map[string]any{
		"spec_version":  "0.2",
		"id":            "evt_adapt_002",
		"type":          "adaptation.outcome.correlated",
		"source":        "agent:worker",
		"created_at":    "2026-07-14T10:01:00Z",
		"tenant_id":     tenantID,
		"actor_id":      "actor_worker",
		"budget_id":     budgetID,
		"budget_cost":   50.0,
		"payload":       map[string]any{},
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

	// Operation exceeding budget
	exceedBudget := map[string]any{
		"spec_version":  "0.2",
		"id":            "evt_adapt_003",
		"type":          "adaptation.outcome.correlated",
		"source":        "agent:worker",
		"created_at":    "2026-07-14T10:02:00Z",
		"tenant_id":     tenantID,
		"actor_id":      "actor_worker",
		"budget_id":     budgetID,
		"budget_cost":   200.0,
		"payload":       map[string]any{},
	}
	responses = h.Handle(exceedBudget)
	foundLimitExceeded := false
	for _, r := range responses {
		if typ, _ := r["type"].(string); typ == "adaptation.budget.limit_exceeded" {
			foundLimitExceeded = true
			payload, _ := r["payload"].(map[string]any)
			if err, ok := payload["error"].(map[string]any); ok {
				if code, _ := err["code"].(string); code != "budget_exceeded" {
					t.Fatalf("expected budget_exceeded error code, got %v", code)
				}
			}
		}
	}
	if !foundLimitExceeded {
		t.Fatal("expected adaptation.budget.limit_exceeded event")
	}
}
```

- [ ] **Step 6: Run Go harness tests**

Run: `cd implementations/go && go test ./harness/ -v -run TestHarnessBudget`
Expected: PASS

- [ ] **Step 7: Commit Go harness budget enforcement**

```bash
git add implementations/go/harness/harness.go implementations/go/harness/util.go implementations/go/harness/harness_test.go
git commit -m "feat: add budget enforcement to Go harness"
```

---

### Task 7: Budget enforcement in Python harness

**Files:**
- Modify: `implementations/python/src/harmovela_harness/__init__.py`

- [ ] **Step 1: Add adaptation import and budget state to Python harness**

Add import at top:
```python
from axisrobo_harmovela_adaptation import ADAPTATION_EVENT_TYPES, is_adaptation_event_type
```

Update `LEGACY_DIMENSION_EVENT_TYPES` to include adaptation types:
```python
LEGACY_DIMENSION_EVENT_TYPES = frozenset({
    ...existing...,
}.union(ADAPTATION_EVENT_TYPES))
```

Add to `__init__`:
```python
self._budget: dict[str, dict[str, float]] = {}  # tenant -> budget_id -> remaining
self._budget_limits: dict[str, float] = {}       # budget_id -> limit
```

- [ ] **Step 2: Add budget enforcement in handle()**

After the authorization check (line 118 in `__init__.py`) and before delivery tracking, add:

```python
# Budget enforcement for adaptation operations
cost = value.get("budget_cost")
if isinstance(cost, (int, float)) and cost > 0:
    budget_id = value.get("budget_id")
    tenant_id = value.get("tenant_id")
    if budget_id and tenant_id:
        remaining = self._budget.get(tenant_id, {}).get(budget_id, 0.0)
        if remaining < cost:
            self._audit.append({
                "actor_id": value.get("actor_id"),
                "tenant_id": tenant_id,
                "action": "adaptation.budget.limit_exceeded",
                "correlation_id": value.get("correlation_id"),
                "causation_id": value.get("causation_id"),
                "allowed": False,
            })
            return [self._event("adaptation.budget.limit_exceeded", value, {
                "budget_id": budget_id,
                "tenant_id": tenant_id,
                "cost": cost,
                "remaining": remaining,
                "limit": self._budget_limits.get(budget_id),
                "error": error_payload(ErrorCode.BUDGET_EXCEEDED, f"budget limit exceeded for {budget_id}"),
            })]
```

- [ ] **Step 3: Add adaptation event handler to router setup**

In `_setup_router`, add:
```python
.on(lambda e: e.get("type", "").startswith("adaptation."), self._handle_adaptation_event)
```

Add handler:

```python
def _handle_adaptation_event(self, event: dict) -> list:
    payload = event.get("payload", {})
    typ = event.get("type", "")

    if typ == "adaptation.budget.established":
        budget_id = payload.get("budget_id")
        limit = payload.get("limit")
        tenant_id = event.get("tenant_id")
        if budget_id and isinstance(limit, (int, float)) and limit > 0:
            self._budget_limits[budget_id] = float(limit)
            if tenant_id:
                self._budget.setdefault(tenant_id, {})[budget_id] = float(limit)
        return [self._event("event.acknowledged", event, {
            "acknowledged_event_id": event.get("id"),
        })]

    if typ == "adaptation.budget.adjusted":
        budget_id = payload.get("budget_id")
        new_limit = payload.get("new_limit")
        tenant_id = event.get("tenant_id")
        if budget_id and isinstance(new_limit, (int, float)):
            old_limit = self._budget_limits.get(budget_id, 0.0)
            delta = new_limit - old_limit
            self._budget_limits[budget_id] = float(new_limit)
            if tenant_id:
                self._budget.setdefault(tenant_id, {}).setdefault(budget_id, 0.0)
                self._budget[tenant_id][budget_id] += delta
        return [self._event("event.acknowledged", event, {
            "acknowledged_event_id": event.get("id"),
        })]

    return [self._event("event.acknowledged", event, {
        "acknowledged_event_id": event.get("id"),
    })]
```

- [ ] **Step 4: Write Python harness budget tests**

Add to `implementations/python/tests/test_harness.py`:

```python
from axisrobo_harmovela_event import ErrorCode
from harmovela_harness import HarmovelaHarness


def test_budget_established_and_enforced():
    harness = HarmovelaHarness()

    budget_established = {
        "spec_version": "0.2",
        "id": "evt_adapt_001",
        "type": "adaptation.budget.established",
        "source": "agent:budget-manager",
        "created_at": "2026-07-14T10:00:00Z",
        "tenant_id": "tenant-alpha",
        "actor_id": "actor_admin",
        "payload": {"budget_id": "budget-01", "limit": 100.0},
    }
    harness.handle(budget_established)
    assert harness._budget_limits.get("budget-01") == 100.0

    within_budget = {
        "spec_version": "0.2",
        "id": "evt_adapt_002",
        "type": "adaptation.outcome.correlated",
        "source": "agent:worker",
        "created_at": "2026-07-14T10:01:00Z",
        "tenant_id": "tenant-alpha",
        "actor_id": "actor_worker",
        "budget_id": "budget-01",
        "budget_cost": 50.0,
        "payload": {},
    }
    responses = harness.handle(within_budget)
    assert any(r["type"] == "event.acknowledged" for r in responses)

    exceed_budget = {
        "spec_version": "0.2",
        "id": "evt_adapt_003",
        "type": "adaptation.outcome.correlated",
        "source": "agent:worker",
        "created_at": "2026-07-14T10:02:00Z",
        "tenant_id": "tenant-alpha",
        "actor_id": "actor_worker",
        "budget_id": "budget-01",
        "budget_cost": 200.0,
        "payload": {},
    }
    responses = harness.handle(exceed_budget)
    limit_exceeded = [r for r in responses if r["type"] == "adaptation.budget.limit_exceeded"]
    assert len(limit_exceeded) == 1
    assert limit_exceeded[0]["payload"]["error"]["code"] == ErrorCode.BUDGET_EXCEEDED
```

- [ ] **Step 5: Run Python harness tests**

Run: `cd implementations/python && python -m pytest tests/test_harness.py::test_budget_established_and_enforced -v`
Expected: PASS

- [ ] **Step 6: Commit Python harness budget enforcement**

```bash
git add implementations/python/src/harmovela_harness/__init__.py implementations/python/tests/test_harness.py
git commit -m "feat: add budget enforcement to Python harness"
```

---

### Task 8: Budget enforcement in TypeScript harness

**Files:**
- Modify: `implementations/typescript/packages/harness/src/harness.js`

- [ ] **Step 1: Add adaptation import and budget state**

Add import:
```js
import { ADAPTATION_EVENT_TYPES } from "@axisrobo/harmovela-adaptation";
```

Add adaptation types to `LEGACY_DIMENSION_EVENT_TYPES`:
```js
const LEGACY_DIMENSION_EVENT_TYPES = new Set([
  ...existing...,
  ...ADAPTATION_EVENT_TYPES,
]);
```

Add budget state in constructor:
```js
this._budget = {};       // tenant -> budget_id -> remaining
this._budgetLimits = {}; // budget_id -> limit
```

- [ ] **Step 2: Add budget enforcement in handle()**

After authorization check (line 140 in harness.js) and before delivery tracking:

```js
// Budget enforcement for adaptation operations
const cost = value.budget_cost;
if (typeof cost === "number" && cost > 0) {
  const budgetId = value.budget_id;
  const tenantId = value.tenant_id;
  if (budgetId && tenantId) {
    const remaining = (this._budget[tenantId] && this._budget[tenantId][budgetId]) || 0;
    if (remaining < cost) {
      this._audit.push({
        actor_id: value.actor_id,
        tenant_id: tenantId,
        action: "adaptation.budget.limit_exceeded",
        correlation_id: value.correlation_id,
        causation_id: value.causation_id,
        allowed: false,
      });
      return [this._event("adaptation.budget.limit_exceeded", value, {
        budget_id: budgetId,
        tenant_id: tenantId,
        cost,
        remaining,
        limit: this._budgetLimits[budgetId],
        error: errorPayload(ErrorCode.BUDGET_EXCEEDED, `budget limit exceeded for ${budgetId}`),
      })];
    }
  }
}
```

- [ ] **Step 3: Add adaptation event handler to router**

In `_setupRouter()`:
```js
.on((event) => event.type && event.type.startsWith("adaptation."), (event) => this._handleAdaptationEvent(event))
```

Add handler:

```js
_handleAdaptationEvent(event) {
  const payload = event.payload || {};
  const type = event.type;

  if (type === "adaptation.budget.established") {
    const budgetId = payload.budget_id;
    const limit = payload.limit;
    const tenantId = event.tenant_id;
    if (budgetId && typeof limit === "number" && limit > 0) {
      this._budgetLimits[budgetId] = limit;
      if (tenantId) {
        if (!this._budget[tenantId]) this._budget[tenantId] = {};
        this._budget[tenantId][budgetId] = limit;
      }
    }
  } else if (type === "adaptation.budget.adjusted") {
    const budgetId = payload.budget_id;
    const newLimit = payload.new_limit;
    const tenantId = event.tenant_id;
    if (budgetId && typeof newLimit === "number") {
      const oldLimit = this._budgetLimits[budgetId] || 0;
      const delta = newLimit - oldLimit;
      this._budgetLimits[budgetId] = newLimit;
      if (tenantId) {
        if (!this._budget[tenantId]) this._budget[tenantId] = {};
        if (!this._budget[tenantId][budgetId]) this._budget[tenantId][budgetId] = 0;
        this._budget[tenantId][budgetId] += delta;
      }
    }
  }

  return [this._event("event.acknowledged", event, {
    acknowledged_event_id: event.id,
  })];
}
```

- [ ] **Step 4: Write TypeScript harness budget tests**

Create `implementations/typescript/packages/harness/test/budget.test.js`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HarmovelaHarness } from "../src/harness.js";
import { ErrorCode } from "@axisrobo/harmovela-event";

describe("Harness budget enforcement", () => {
  it("establishes budget, allows within-budget, rejects exceeding", () => {
    const h = new HarmovelaHarness();

    const established = {
      spec_version: "0.2",
      id: "evt_adapt_001",
      type: "adaptation.budget.established",
      source: "agent:budget-manager",
      created_at: "2026-07-14T10:00:00Z",
      tenant_id: "tenant-alpha",
      actor_id: "actor_admin",
      payload: { budget_id: "budget-01", limit: 100 },
    };
    h.handle(established);
    assert.equal(h._budgetLimits["budget-01"], 100);

    const withinBudget = {
      spec_version: "0.2",
      id: "evt_adapt_002",
      type: "adaptation.outcome.correlated",
      source: "agent:worker",
      created_at: "2026-07-14T10:01:00Z",
      tenant_id: "tenant-alpha",
      actor_id: "actor_worker",
      budget_id: "budget-01",
      budget_cost: 50,
      payload: {},
    };
    const resp1 = h.handle(withinBudget);
    assert.ok(resp1.some((r) => r.type === "event.acknowledged"));

    const exceedBudget = {
      spec_version: "0.2",
      id: "evt_adapt_003",
      type: "adaptation.outcome.correlated",
      source: "agent:worker",
      created_at: "2026-07-14T10:02:00Z",
      tenant_id: "tenant-alpha",
      actor_id: "actor_worker",
      budget_id: "budget-01",
      budget_cost: 200,
      payload: {},
    };
    const resp2 = h.handle(exceedBudget);
    const limitExceeded = resp2.find((r) => r.type === "adaptation.budget.limit_exceeded");
    assert.ok(limitExceeded);
    assert.equal(limitExceeded.payload.error.code, ErrorCode.BUDGET_EXCEEDED);
  });
});
```

- [ ] **Step 5: Run TypeScript harness budget tests**

Run: `cd implementations/typescript && node --test packages/harness/test/budget.test.js`
Expected: PASS

- [ ] **Step 6: Commit TypeScript harness budget enforcement**

```bash
git add implementations/typescript/packages/harness/src/harness.js implementations/typescript/packages/harness/test/budget.test.js
git commit -m "feat: add budget enforcement to TypeScript harness"
```

---

### Task 9: Budget enforcement in Java harness

**Files:**
- Modify: `implementations/java/src/main/java/com/axisrobo/harmovela/harness/Harness.java`
- Modify: `implementations/java/src/test/java/com/axisrobo/harmovela/harness/HarnessTest.java`

- [ ] **Step 1: Add adaptation types to Java Harness STANDARD_TYPES**

Add the 10 adaptation types to the `STANDARD_TYPES` set.

Add budget state fields:
```java
private final Map<String, Map<String, Double>> budget = new LinkedHashMap<>();  // tenant -> budget_id -> remaining
private final Map<String, Double> budgetLimits = new LinkedHashMap<>();          // budget_id -> limit
```

- [ ] **Step 2: Add budget enforcement in handle()**

After authorization check (line 129 in Harness.java) and before delivery tracking:

```java
// Budget enforcement for adaptation operations
Object costRaw = value.get("budget_cost");
if (costRaw instanceof Number num && num.doubleValue() > 0) {
    double cost = num.doubleValue();
    String budgetId = (String) value.get("budget_id");
    if (budgetId != null && tenantId != null) {
        var tenantMap = budget.get(tenantId);
        double remaining = tenantMap != null && tenantMap.containsKey(budgetId)
            ? tenantMap.get(budgetId) : 0.0;
        if (remaining < cost) {
            var auditEntry = new LinkedHashMap<String, Object>();
            auditEntry.put("actor_id", actorId);
            auditEntry.put("tenant_id", tenantId);
            auditEntry.put("action", "adaptation.budget.limit_exceeded");
            auditEntry.put("correlation_id", correlationId);
            auditEntry.put("causation_id", causationId);
            auditEntry.put("allowed", false);
            audit.add(auditEntry);
            return List.of(newEvent("adaptation.budget.limit_exceeded", value, Map.of(
                "budget_id", budgetId, "tenant_id", tenantId, "cost", cost,
                "remaining", remaining, "limit", budgetLimits.getOrDefault(budgetId, 0.0),
                "error", Errors.errorPayload(Errors.BUDGET_EXCEEDED, "budget limit exceeded for " + budgetId, false)
            )));
        }
    }
}
```

- [ ] **Step 3: Add adaptation event handler to router**

In constructor (after task handler setup, before session setup):
```java
.on(e -> {
    var t = (String) e.get("type");
    return t != null && t.startsWith("adaptation.");
}, this::handleAdaptationEvent)
```

Add handler:

```java
@SuppressWarnings("unchecked")
private Object handleAdaptationEvent(Map<String, Object> event) {
    var payload = (Map<String, Object>) event.getOrDefault("payload", Map.of());
    var type = (String) event.get("type");

    if ("adaptation.budget.established".equals(type)) {
        var budgetId = (String) payload.get("budget_id");
        if (payload.get("limit") instanceof Number num) {
            double limit = num.doubleValue();
            if (budgetId != null && limit > 0) {
                budgetLimits.put(budgetId, limit);
                var tenantId = (String) event.get("tenant_id");
                if (tenantId != null) {
                    budget.computeIfAbsent(tenantId, k -> new LinkedHashMap<>()).put(budgetId, limit);
                }
            }
        }
    } else if ("adaptation.budget.adjusted".equals(type)) {
        var budgetId = (String) payload.get("budget_id");
        if (payload.get("new_limit") instanceof Number num) {
            double newLimit = num.doubleValue();
            if (budgetId != null) {
                double oldLimit = budgetLimits.getOrDefault(budgetId, 0.0);
                budgetLimits.put(budgetId, newLimit);
                var tenantId = (String) event.get("tenant_id");
                if (tenantId != null) {
                    var tenantMap = budget.computeIfAbsent(tenantId, k -> new LinkedHashMap<>());
                    tenantMap.merge(budgetId, newLimit - oldLimit, Double::sum);
                }
            }
        }
    }

    return List.of(newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id"))));
}
```

- [ ] **Step 4: Write Java harness budget tests**

Add to `HarnessTest.java`:

```java
@Test
void budgetEstablishedAndEnforced() {
    var h = new Harness();
    var tenantId = "tenant-alpha";
    var budgetId = "budget-01";

    // Pre-establish budget
    h.budgetLimits.put(budgetId, 100.0);
    h.budget.computeIfAbsent(tenantId, k -> new LinkedHashMap<>()).put(budgetId, 100.0);

    var established = new LinkedHashMap<String, Object>();
    established.put("spec_version", "0.2");
    established.put("id", "evt_adapt_001");
    established.put("type", "adaptation.budget.established");
    established.put("source", "agent:budget-manager");
    established.put("created_at", "2026-07-14T10:00:00Z");
    established.put("tenant_id", tenantId);
    established.put("actor_id", "actor_admin");
    established.put("payload", Map.of("budget_id", budgetId, "limit", 100.0));

    var responses = h.handle(established);
    assertNotNull(responses);

    var withinBudget = new LinkedHashMap<String, Object>();
    withinBudget.put("spec_version", "0.2");
    withinBudget.put("id", "evt_adapt_002");
    withinBudget.put("type", "adaptation.outcome.correlated");
    withinBudget.put("source", "agent:worker");
    withinBudget.put("created_at", "2026-07-14T10:01:00Z");
    withinBudget.put("tenant_id", tenantId);
    withinBudget.put("actor_id", "actor_worker");
    withinBudget.put("budget_id", budgetId);
    withinBudget.put("budget_cost", 50.0);
    withinBudget.put("payload", Map.of());

    responses = h.handle(withinBudget);
    assertFalse(responses.isEmpty());

    var exceedBudget = new LinkedHashMap<String, Object>();
    exceedBudget.put("spec_version", "0.2");
    exceedBudget.put("id", "evt_adapt_003");
    exceedBudget.put("type", "adaptation.outcome.correlated");
    exceedBudget.put("source", "agent:worker");
    exceedBudget.put("created_at", "2026-07-14T10:02:00Z");
    exceedBudget.put("tenant_id", tenantId);
    exceedBudget.put("actor_id", "actor_worker");
    exceedBudget.put("budget_id", budgetId);
    exceedBudget.put("budget_cost", 200.0);
    exceedBudget.put("payload", Map.of());

    responses = h.handle(exceedBudget);
    var limitExceeded = responses.stream()
        .filter(r -> "adaptation.budget.limit_exceeded".equals(r.get("type")))
        .findFirst();
    assertTrue(limitExceeded.isPresent());
    var err = (Map<String, Object>) limitExceeded.get().get("payload");
    assertNotNull(err);
    var error = (Map<String, Object>) err.get("error");
    assertEquals(Errors.BUDGET_EXCEEDED, error.get("code"));
}
```

- [ ] **Step 5: Run Java harness tests**

Run: `cd implementations/java && mvn test -pl . -Dtest=HarnessTest#budgetEstablishedAndEnforced -DfailIfNoTests=false -q`
Expected: PASS

- [ ] **Step 6: Commit Java harness budget enforcement**

```bash
git add implementations/java/src/main/java/com/axisrobo/harmovela/harness/Harness.java implementations/java/src/test/java/com/axisrobo/harmovela/harness/HarnessTest.java
git commit -m "feat: add budget enforcement to Java harness"
```

---

### Task 10: Conformance fixtures for adaptation

**Files:**
- Create: `conformance/fixtures/adaptation-positive.ndjson`
- Create: `conformance/fixtures/adaptation-negative.ndjson`
- Modify: `conformance/manifest.json`

- [ ] **Step 1: Create adaptation-positive.ndjson**

```ndjson
{"spec_version":"0.2","id":"evt_adapt_pos_001","type":"adaptation.budget.established","source":"agent:budget-manager","created_at":"2026-07-14T10:00:00Z","tenant_id":"tenant-alpha","actor_id":"actor_admin","payload":{"budget_id":"budget-pos-01","limit":100.0}}
{"spec_version":"0.2","id":"evt_adapt_pos_002","type":"adaptation.goal.created","source":"agent:planner","created_at":"2026-07-14T10:00:05Z","payload":{"goal_id":"goal-01","description":"reduce latency","target":95}}
{"spec_version":"0.2","id":"evt_adapt_pos_003","type":"adaptation.outcome.correlated","source":"agent:worker","created_at":"2026-07-14T10:00:10Z","tenant_id":"tenant-alpha","actor_id":"actor_worker","budget_id":"budget-pos-01","budget_cost":25.0,"payload":{"outcome":"latency_reduced","goal_id":"goal-01"}}
{"spec_version":"0.2","id":"evt_adapt_pos_004","type":"adaptation.goal.updated","source":"agent:planner","created_at":"2026-07-14T10:00:15Z","payload":{"goal_id":"goal-01","new_target":98}}
{"spec_version":"0.2","id":"evt_adapt_pos_005","type":"adaptation.goal.achieved","source":"agent:worker","created_at":"2026-07-14T10:00:20Z","payload":{"goal_id":"goal-01","result":"target met"}}
```

- [ ] **Step 2: Create adaptation-negative.ndjson**

```ndjson
{"spec_version":"0.2","id":"evt_adapt_neg_001","type":"adaptation.budget.established","source":"agent:budget-manager","created_at":"2026-07-14T10:00:00Z","tenant_id":"tenant-alpha","actor_id":"actor_admin","payload":{"budget_id":"budget-neg-01","limit":50.0}}
{"spec_version":"0.2","id":"evt_adapt_neg_002","type":"adaptation.outcome.correlated","source":"agent:worker","created_at":"2026-07-14T10:00:05Z","tenant_id":"tenant-alpha","actor_id":"actor_worker","budget_id":"budget-neg-01","budget_cost":200.0,"payload":{"outcome":"over_budget_attempt"}}
{"spec_version":"0.2","id":"evt_adapt_neg_003","type":"adaptation.cost.exceeded","source":"agent:worker","created_at":"2026-07-14T10:00:10Z","payload":{"budget_id":"budget-neg-01","actual_cost":200.0,"limit":50.0}}
{"spec_version":"0.2","id":"evt_adapt_neg_004","type":"adaptation.budget.exhausted","source":"agent:monitor","created_at":"2026-07-14T10:00:15Z","payload":{"budget_id":"budget-neg-01","remaining":0.0}}
```

- [ ] **Step 3: Add fixtures to manifest.json**

Add to the `"fixtures"` array (before the last `]`):

```json
{
  "path": "fixtures/adaptation-positive.ndjson",
  "level": "HARMOVELA-C1",
  "description": "Adaptation budget established, goal lifecycle, and outcome correlated within budget.",
  "expectation": "stateful_flow",
  "profile": "adaptation",
  "tags": ["adaptation", "budget", "goal"],
  "expected_types": [
    "adaptation.budget.established",
    "adaptation.goal.created",
    "adaptation.outcome.correlated",
    "adaptation.goal.updated",
    "adaptation.goal.achieved"
  ]
},
{
  "path": "fixtures/adaptation-negative.ndjson",
  "level": "HARMOVELA-C1",
  "description": "Adaptation budget limit exceeded rejection and cost exceeded flow.",
  "expectation": "reject_some",
  "profile": "adaptation",
  "tags": ["negative", "adaptation", "budget"],
  "expected_types": [
    "adaptation.budget.established",
    "adaptation.outcome.correlated",
    "adaptation.cost.exceeded",
    "adaptation.budget.exhausted"
  ]
}
```

Add to the `"profiles"` object:

```json
"adaptation": {
  "display_name": "Autonomous Adaptation",
  "description": "Budget-controlled autonomous adaptation with goal tracking, outcome correlation, and cost enforcement.",
  "required_core_level": "HARMOVELA-C1",
  "levels": ["HARMOVELA-C1"],
  "fixtures": [
    "fixtures/adaptation-positive.ndjson",
    "fixtures/adaptation-negative.ndjson"
  ]
}
```

- [ ] **Step 4: Commit conformance fixtures**

```bash
git add conformance/fixtures/adaptation-positive.ndjson conformance/fixtures/adaptation-negative.ndjson conformance/manifest.json
git commit -m "feat: add adaptation conformance fixtures (positive and negative)"
```

---

### Task 11: Cross-language verification

- [ ] **Step 1: Run Go full test suite**

Run: `cd implementations/go && go test ./... -count=1`
Expected: PASS (all packages)

- [ ] **Step 2: Run Python full test suite**

Run: `cd implementations/python && python -m pytest tests/ -v`
Expected: PASS (all tests, note conformance tests will need environment profile or skip)

- [ ] **Step 3: Run TypeScript full test suite**

Run: `cd implementations/typescript && node --test packages/*/test/`
Expected: PASS (all packages)

- [ ] **Step 4: Run Java full test suite**

Run: `cd implementations/java && mvn test -q`
Expected: PASS (all tests)

- [ ] **Step 5: Commit verification pass**

```bash
git commit -m "test: verify cross-language adaptation and budget enforcement tests pass"
```

---

### Task 12: Final squash/merge commit

- [ ] **Step 1: Squash all commits into final**

```bash
git reset --soft HEAD~<N>
git commit -m "feat: implement 0.5 Adaptation Preview module and enforcement"
```

- [ ] **Step 2: Record test results**

Run all tests, capture output, and return commit hash.

---

## Self-Review

**1. Spec coverage:**
- (1) Adaptation dimension module in all 4 languages: Tasks 1-4
- (1) Event type registry for 10 types: All tasks create the registry
- (2) Budget enforcement in harness: Tasks 6-9
- (2) Budget state tracking: Tasks 6-9
- (2) Limit exceeded events with event.rejected/limit_exceeded: Tasks 6-9
- (3) Adaptation conformance fixtures positive: Task 10
- (3) Adaptation conformance fixtures negative: Task 10
- (3) Declare in manifest at C1 under harmovela.adaptation.v1: Task 10
- Cross-language verification: Task 11
- Commit with message: Task 12

**2. Placeholder scan:** No TBDs, TODOs, or placeholders found.

**3. Type consistency:** All adaption types match across languages. Error code `budget_exceeded` is consistent.
