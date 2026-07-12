package transport

import (
	"encoding/json"
	"testing"
)

func TestRedisStreamKeyRouting(t *testing.T) {
	tr := NewRedisTransport("localhost:6379", "aep.events")
	tr.SetPrefix("aep")

	if got := tr.streamKey(map[string]any{"type": "task.progress"}); got != "aep.type.task.progress" {
		t.Fatalf("expected aep.type.task.progress, got %s", got)
	}
	if got := tr.streamKey(map[string]any{"source": "sensor:a"}); got != "aep.source.sensor:a" {
		t.Fatalf("expected aep.source.sensor:a, got %s", got)
	}
	if got := tr.streamKey(map[string]any{}); got != "aep.events" {
		t.Fatalf("expected aep.events, got %s", got)
	}
}

func TestRedisConsumerGroup(t *testing.T) {
	tr := NewRedisTransport("", "aep.events")
	if got := tr.consumerGroup(map[string]any{"session_id": "sess_01"}); got != "aep-sess_01" {
		t.Fatalf("expected aep-sess_01, got %s", got)
	}
	if got := tr.consumerGroup(map[string]any{}); got != "aep-default" {
		t.Fatalf("expected aep-default, got %s", got)
	}
}

func TestRedisEntryFields(t *testing.T) {
	tr := NewRedisTransport("", "aep.events")
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

	f := tr.entryFields(event)
	if f["aep-type"] != "task.submitted" {
		t.Fatal("missing aep-type")
	}
	if f["aep-source"] != "agent:researcher" {
		t.Fatal("missing aep-source")
	}
	if f["aep-session"] != "sess_01" {
		t.Fatal("missing aep-session")
	}
	if f["aep-conversation"] != "conv_01" {
		t.Fatal("missing aep-conversation")
	}
	if f["aep-task"] != "task_01" {
		t.Fatal("missing aep-task")
	}
	if f["aep-correlation"] != "corr_01" {
		t.Fatal("missing aep-correlation")
	}
	if f["aep-causation"] != "evt_001" {
		t.Fatal("missing aep-causation")
	}
	if f["aep-delivery-mode"] != "at_least_once" {
		t.Fatal("missing aep-delivery-mode")
	}
	var roundtrip map[string]any
	if err := json.Unmarshal([]byte(f["body"]), &roundtrip); err != nil {
		t.Fatalf("body not valid JSON: %v", err)
	}
	if roundtrip["task_id"] != "task_01" {
		t.Fatal("body missing task_id")
	}
	if len(f) != 9 {
		t.Fatalf("expected 9 fields (8 flat + body), got %d", len(f))
	}
}

func TestRedisSendValidJSON(t *testing.T) {
	tr := NewRedisTransport("", "aep.events")
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

func TestRedisConstructorDefaults(t *testing.T) {
	tr := NewRedisTransport("", "")
	if tr.addr != "localhost:6379" {
		t.Fatalf("expected default addr, got %s", tr.addr)
	}
	if tr.stream != "aep.events" {
		t.Fatalf("expected aep.events, got %s", tr.stream)
	}
	if tr.IsRunning() {
		t.Fatal("should not be running")
	}
}
