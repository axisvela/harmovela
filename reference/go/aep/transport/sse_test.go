package transport

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSseServesEventStreamContentType(t *testing.T) {
	srv := NewSseServer()
	ts := httptest.NewServer(srv)
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/events")
	if err != nil {
		t.Fatalf("failed to GET /events: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	ct := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "text/event-stream") {
		t.Fatalf("expected text/event-stream content type, got %s", ct)
	}
}

func TestSseIngestAcceptsValidEvent(t *testing.T) {
	srv := NewSseServer()
	ts := httptest.NewServer(srv)
	defer ts.Close()

	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "task.progress",
		"source":      "test",
		"created_at":  "2025-01-01T00:00:00Z",
		"payload":     map[string]any{},
	}
	body, _ := json.Marshal(event)

	resp, err := http.Post(ts.URL+"/ingest", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("failed to POST /ingest: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", resp.StatusCode)
	}
}

func TestSseIngestRejectsInvalidJson(t *testing.T) {
	srv := NewSseServer()
	ts := httptest.NewServer(srv)
	defer ts.Close()

	body := bytes.NewReader([]byte("not json"))

	resp, err := http.Post(ts.URL+"/ingest", "application/json", body)
	if err != nil {
		t.Fatalf("failed to POST /ingest: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}
