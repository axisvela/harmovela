package transport

import (
	"encoding/json"
	"testing"
)

func TestKafkaMessageKeyPriority(t *testing.T) {
	tr := NewKafkaTransport([]string{"localhost:9092"}, "aep.events")

	key := tr.messageKey(map[string]any{"task_id": "task_01", "conversation_id": "conv_01", "session_id": "sess_01", "source": "agent:x"})
	if key != "task_01" {
		t.Fatalf("expected task_01, got %s", key)
	}

	key = tr.messageKey(map[string]any{"conversation_id": "conv_01", "session_id": "sess_01"})
	if key != "conv_01" {
		t.Fatalf("expected conv_01, got %s", key)
	}

	key = tr.messageKey(map[string]any{"session_id": "sess_01"})
	if key != "sess_01" {
		t.Fatalf("expected sess_01, got %s", key)
	}

	key = tr.messageKey(map[string]any{"source": "agent:researcher"})
	if key != "agent:researcher" {
		t.Fatalf("expected agent:researcher, got %s", key)
	}

	key = tr.messageKey(map[string]any{})
	if key != "" {
		t.Fatalf("expected empty, got %s", key)
	}
}

func TestKafkaTargetTopic(t *testing.T) {
	tr := NewKafkaTransport(nil, "aep.events")
	tr.SetPrefix("aep")

	if got := tr.targetTopic(map[string]any{"type": "task.progress"}); got != "aep.type.task.progress" {
		t.Fatalf("expected aep.type.task.progress, got %s", got)
	}
	if got := tr.targetTopic(map[string]any{"source": "sensor:a"}); got != "aep.source.sensor:a" {
		t.Fatalf("expected aep.source.sensor:a, got %s", got)
	}
	if got := tr.targetTopic(map[string]any{}); got != "aep.events" {
		t.Fatalf("expected aep.events, got %s", got)
	}
}

func TestKafkaMessageHeaders(t *testing.T) {
	tr := NewKafkaTransport(nil, "aep.events")
	event := map[string]any{
		"type":            "task.submitted",
		"source":          "agent:researcher",
		"session_id":      "sess_01",
		"conversation_id": "conv_01",
		"task_id":         "task_01",
		"correlation_id":  "corr_01",
		"causation_id":    "evt_001",
		"delivery":        map[string]any{"mode": "at_least_once"},
	}

	headers := tr.messageHeaders(event)
	if headers["aep-type"] != "task.submitted" {
		t.Fatal("missing aep-type")
	}
	if headers["aep-source"] != "agent:researcher" {
		t.Fatal("missing aep-source")
	}
	if headers["aep-session"] != "sess_01" {
		t.Fatal("missing aep-session")
	}
	if headers["aep-conversation"] != "conv_01" {
		t.Fatal("missing aep-conversation")
	}
	if headers["aep-task"] != "task_01" {
		t.Fatal("missing aep-task")
	}
	if headers["aep-correlation"] != "corr_01" {
		t.Fatal("missing aep-correlation")
	}
	if headers["aep-causation"] != "evt_001" {
		t.Fatal("missing aep-causation")
	}
	if headers["aep-delivery-mode"] != "at_least_once" {
		t.Fatal("missing aep-delivery-mode")
	}
	if len(headers) != 8 {
		t.Fatalf("expected 8 headers, got %d", len(headers))
	}
}

func TestKafkaSendValidJSON(t *testing.T) {
	tr := NewKafkaTransport(nil, "aep.events")
	event := map[string]any{"aep_version": "0.1", "id": "evt_001", "type": "test", "source": "test", "created_at": "2026-07-10T10:00:00Z", "payload": map[string]any{}}

	if err := tr.Send(event); err != nil {
		t.Fatalf("send: %v", err)
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
		t.Fatal("bad roundtrip")
	}
}

func TestKafkaConstructorDefaults(t *testing.T) {
	tr := NewKafkaTransport(nil, "")
	if len(tr.brokers) != 1 || tr.brokers[0] != "localhost:9092" {
		t.Fatalf("expected default broker, got %v", tr.brokers)
	}
	if tr.topic != "aep.events" {
		t.Fatalf("expected aep.events, got %s", tr.topic)
	}
	if tr.IsRunning() {
		t.Fatal("should not be running")
	}
}
