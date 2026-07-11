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
