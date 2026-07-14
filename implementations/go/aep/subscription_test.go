package aep

import (
	"testing"

	"github.com/axisrobo/harmovela/event"
)

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
		if got := event.MatchesType(c.pattern, c.value); got != c.want {
			t.Fatalf("MatchesType(%q,%q)=%v want %v", c.pattern, c.value, got, c.want)
		}
	}
}

func TestSubscriptionMatches(t *testing.T) {
	evt := map[string]any{"type": "task.submitted", "source": "agent:x"}
	if !event.SubscriptionMatches(map[string]any{"types": "task.*"}, evt) {
		t.Fatal("expected type match")
	}
	if event.SubscriptionMatches(map[string]any{"types": "memory.*"}, evt) {
		t.Fatal("expected type mismatch")
	}
	if !event.SubscriptionMatches(map[string]any{"types": "task.*", "source": "agent:x"}, evt) {
		t.Fatal("expected source match")
	}
	if event.SubscriptionMatches(map[string]any{"source": "agent:y"}, evt) {
		t.Fatal("expected source mismatch")
	}
	if !event.SubscriptionMatches(map[string]any{}, evt) {
		t.Fatal("empty filter should match")
	}
}
