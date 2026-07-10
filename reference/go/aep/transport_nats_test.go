package aep

import (
	"encoding/json"
	"testing"
)

func TestNatsEventSubject(t *testing.T) {
	tr := NewNatsTransportWithConn(nil)

	tests := []struct {
		name     string
		event    map[string]any
		expected string
	}{
		{
			name:     "with topic",
			event:    map[string]any{"topic": "tasks.task_01"},
			expected: "aep.topic.tasks.task_01",
		},
		{
			name:     "with type",
			event:    map[string]any{"type": "task.progress"},
			expected: "aep.type.task.progress",
		},
		{
			name:     "with source",
			event:    map[string]any{"source": "agent:researcher"},
			expected: "aep.source.agent:researcher",
		},
		{
			name:     "fallback",
			event:    map[string]any{},
			expected: "aep.event",
		},
		{
			name:     "topic takes priority",
			event:    map[string]any{"topic": "tasks.task_01", "type": "task.progress", "source": "agent:researcher"},
			expected: "aep.topic.tasks.task_01",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tr.eventSubject(tt.event)
			if got != tt.expected {
				t.Fatalf("expected %s, got %s", tt.expected, got)
			}
		})
	}
}

func TestNatsReplaceWildcard(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"aep.type.task.*", "aep.type.task.>"},
		{"aep.type.*", "aep.type.>"},
		{"aep.type.memory.*", "aep.type.memory.>"},
		{"aep.type.tool.call.progress", "aep.type.tool.call.progress"},
		{"aep.>", "aep.>"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := replaceWildcard(tt.input)
			if got != tt.expected {
				t.Fatalf("expected %s, got %s", tt.expected, got)
			}
		})
	}
}

func TestNatsSubscriptionTypes(t *testing.T) {
	tr := NewNatsTransportWithConn(nil)

	subjects := tr.SubscriptionTypes([]string{"task.*", "memory.*"}, "sess_01")
	expected := []string{"aep.type.task.>", "aep.type.memory.>", "aep.sess.sess_01"}

	if len(subjects) != len(expected) {
		t.Fatalf("expected %d subjects, got %d", len(expected), len(subjects))
	}
	for i, s := range subjects {
		if s != expected[i] {
			t.Fatalf("subject %d: expected %s, got %s", i, expected[i], s)
		}
	}
}

func TestNatsSubscriptionTypesAll(t *testing.T) {
	tr := NewNatsTransportWithConn(nil)

	subjects := tr.SubscriptionTypes([]string{"*"}, "")
	if len(subjects) != 1 || subjects[0] != "aep.>" {
		t.Fatalf("expected aep.>, got %v", subjects)
	}
}

func TestNatsPrefix(t *testing.T) {
	tr := NewNatsTransportWithConn(nil)
	tr.SetPrefix("custom")

	got := tr.eventSubject(map[string]any{"type": "task.progress"})
	expected := "custom.type.task.progress"
	if got != expected {
		t.Fatalf("expected %s, got %s", expected, got)
	}
}

func TestNatsSendMarshal(t *testing.T) {
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "task.submitted",
		"source":      "agent:test",
		"created_at":  "2026-07-10T10:00:00Z",
		"payload":     map[string]any{"description": "test"},
	}

	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var roundtrip map[string]any
	if err := json.Unmarshal(data, &roundtrip); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if roundtrip["id"] != "evt_001" {
		t.Fatalf("expected evt_001, got %v", roundtrip["id"])
	}
}

func TestNatsIsRunning(t *testing.T) {
	tr := NewNatsTransportWithConn(nil)
	if tr.IsRunning() {
		t.Fatal("expected false for new transport")
	}

	tr.running = true
	if !tr.IsRunning() {
		t.Fatal("expected true after Start")
	}
}

func TestNatsCloseWithoutConn(t *testing.T) {
	tr := NewNatsTransportWithConn(nil)
	tr.Close()
}
