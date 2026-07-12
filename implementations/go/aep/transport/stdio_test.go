package transport

import (
	"encoding/json"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestStdioParseNdjsonEvents(t *testing.T) {
	reader := strings.NewReader(
		`{"spec_version":"0.2","id":"evt_01","type":"session.opened","source":"test","created_at":"2026-07-10T10:00:00Z","payload":{}}
{"spec_version":"0.2","id":"evt_02","type":"session.ready","source":"test","created_at":"2026-07-10T10:00:01Z","payload":{"session_id":"s1"}}
{"spec_version":"0.2","id":"evt_03","type":"session.closed","source":"test","created_at":"2026-07-10T10:00:02Z","payload":{"reason":"done"}}
`)
	var buf strings.Builder
	transport := NewStdioTransport(reader, &buf)

	received := make([]map[string]any, 0)
	var mu sync.Mutex
	transport.OnMessage(func(event map[string]any) {
		mu.Lock()
		received = append(received, event)
		mu.Unlock()
	})

	transport.Start()
	time.Sleep(100 * time.Millisecond)
	transport.Stop()

	mu.Lock()
	defer mu.Unlock()
	if len(received) != 3 {
		t.Fatalf("expected 3 events, got %d", len(received))
	}
	if typ, _ := received[0]["type"].(string); typ != "session.opened" {
		t.Fatalf("expected session.opened, got %s", typ)
	}
	if typ, _ := received[1]["type"].(string); typ != "session.ready" {
		t.Fatalf("expected session.ready, got %s", typ)
	}
	if typ, _ := received[2]["type"].(string); typ != "session.closed" {
		t.Fatalf("expected session.closed, got %s", typ)
	}
}

func TestStdioCaptureSentData(t *testing.T) {
	var buf strings.Builder
	reader := strings.NewReader("")
	transport := NewStdioTransport(reader, &buf)

	event := map[string]any{
		"spec_version": "0.2",
		"id":          "evt_01",
		"type":        "session.ready",
		"source":      "test",
		"created_at":  "2026-07-10T10:00:00Z",
		"payload":     map[string]any{"session_id": "s1"},
	}

	if err := transport.Send(event); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	line := strings.TrimSpace(buf.String())
	if line == "" {
		t.Fatal("expected output, got empty")
	}

	var parsed map[string]any
	if err := json.Unmarshal([]byte(line), &parsed); err != nil {
		t.Fatalf("output is not valid JSON: %v", err)
	}
	if typ, _ := parsed["type"].(string); typ != "session.ready" {
		t.Fatalf("expected session.ready, got %s", typ)
	}
}

func TestStdioIgnoreEmptyLines(t *testing.T) {
	reader := strings.NewReader(
		`{"spec_version":"0.2","id":"evt_01","type":"session.opened","source":"test","created_at":"2026-07-10T10:00:00Z","payload":{}}

{"spec_version":"0.2","id":"evt_02","type":"session.ready","source":"test","created_at":"2026-07-10T10:00:01Z","payload":{"session_id":"s1"}}


`)
	var buf strings.Builder
	transport := NewStdioTransport(reader, &buf)

	received := make([]map[string]any, 0)
	var mu sync.Mutex
	transport.OnMessage(func(event map[string]any) {
		mu.Lock()
		received = append(received, event)
		mu.Unlock()
	})

	transport.Start()
	time.Sleep(100 * time.Millisecond)
	transport.Stop()

	mu.Lock()
	defer mu.Unlock()
	if len(received) != 2 {
		t.Fatalf("expected 2 events (empty lines ignored), got %d", len(received))
	}
}

func TestStdioMalformedJsonError(t *testing.T) {
	reader := strings.NewReader("not valid json\n")
	var buf strings.Builder
	transport := NewStdioTransport(reader, &buf)

	errs := make([]string, 0)
	var mu sync.Mutex
	transport.OnError(func(err error) {
		mu.Lock()
		errs = append(errs, err.Error())
		mu.Unlock()
	})

	transport.Start()
	time.Sleep(100 * time.Millisecond)
	transport.Stop()

	mu.Lock()
	defer mu.Unlock()
	if len(errs) == 0 {
		t.Fatal("expected error for malformed JSON")
	}
}
