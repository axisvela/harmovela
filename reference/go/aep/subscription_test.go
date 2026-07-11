package aep

import "testing"

func TestMatchesType(t *testing.T) {
	cases := []struct {
		pattern string
		value   string
		want    bool
	}{
		{"*", "task.submitted", true},
		{"task.*", "task.submitted", true},
		{"task.*", "memory.updated", false},
		{"task.submitted", "task.submitted", true},
		{"task.submitted", "task.accepted", false},
		{"task.*.done", "task.build.done", true},
		{"task.*.done", "task.build.failed", false},
	}
	for _, c := range cases {
		if got := MatchesType(c.pattern, c.value); got != c.want {
			t.Fatalf("MatchesType(%q,%q)=%v want %v", c.pattern, c.value, got, c.want)
		}
	}
}

func TestSubscriptionMatches(t *testing.T) {
	event := map[string]any{"type": "task.submitted", "source": "agent:x"}
	if !SubscriptionMatches(map[string]any{"types": "task.*"}, event) {
		t.Fatal("expected type match")
	}
	if SubscriptionMatches(map[string]any{"types": "memory.*"}, event) {
		t.Fatal("expected type mismatch")
	}
	if !SubscriptionMatches(map[string]any{"types": "task.*", "source": "agent:x"}, event) {
		t.Fatal("expected source match")
	}
	if SubscriptionMatches(map[string]any{"source": "agent:y"}, event) {
		t.Fatal("expected source mismatch")
	}
	if !SubscriptionMatches(map[string]any{}, event) {
		t.Fatal("empty filter should match")
	}
}
