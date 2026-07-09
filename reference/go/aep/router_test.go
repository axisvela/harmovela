package aep

import (
	"testing"
)

func TestRouterDispatchesToMatchingHandler(t *testing.T) {
	r := NewEventRouter()
	called := false
	r.On(func(event map[string]any) bool {
		typ, _ := event["type"].(string)
		return typ == "task.started"
	}, func(event map[string]any) any {
		called = true
		return map[string]any{"type": "event.acknowledged"}
	})

	results := r.Dispatch(map[string]any{"type": "task.started"})
	if !called {
		t.Fatal("handler was not called")
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
}

func TestRouterMatchAllHandler(t *testing.T) {
	r := NewEventRouter()
	count := 0
	r.OnAll(func(event map[string]any) any {
		count++
		return nil
	})

	r.Dispatch(map[string]any{"type": "task.started"})
	r.Dispatch(map[string]any{"type": "session.opened"})
	if count != 2 {
		t.Fatalf("expected 2 calls, got %d", count)
	}
}

func TestRouterCollectsMultipleResponses(t *testing.T) {
	r := NewEventRouter()
	r.OnAll(func(event map[string]any) any {
		return []map[string]any{
			{"type": "event.acknowledged"},
			{"type": "session.ready"},
		}
	})

	results := r.Dispatch(map[string]any{"type": "task.started"})
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
}

func TestRouterHandlesSliceOfAnyResponses(t *testing.T) {
	r := NewEventRouter()
	r.OnAll(func(event map[string]any) any {
		return []any{
			map[string]any{"type": "event.acknowledged"},
			map[string]any{"type": "task.completed"},
		}
	})
	results := r.Dispatch(map[string]any{"type": "task.started"})
	if len(results) != 2 {
		t.Fatalf("expected 2 results from []any, got %d", len(results))
	}
}

func TestRouterNoMatchReturnsEmpty(t *testing.T) {
	r := NewEventRouter()
	r.On(func(event map[string]any) bool {
		return false
	}, func(event map[string]any) any {
		return map[string]any{"type": "event.acknowledged"}
	})

	results := r.Dispatch(map[string]any{"type": "task.started"})
	if len(results) != 0 {
		t.Fatalf("expected 0 results, got %d", len(results))
	}
}
