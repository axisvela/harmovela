package runtime

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"
)

func memoryAPIConfig(port int) RuntimeConfig {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = true
	c.Transports.API.Host = "127.0.0.1"
	c.Transports.API.Port = port
	return c
}

func TestDefaultConfig(t *testing.T) {
	c := DefaultConfig()
	if c.SpecVersion != "0.2" {
		t.Fatalf("expected 0.2, got %s", c.SpecVersion)
	}
	if c.Transports.API.Port != 8790 {
		t.Fatalf("expected 8790, got %d", c.Transports.API.Port)
	}
	if c.Delivery.Store != "sqlite" {
		t.Fatalf("expected sqlite, got %s", c.Delivery.Store)
	}
}

func TestRuntimePublishToSubscriber(t *testing.T) {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = false
	svc := NewRuntimeService(c)
	seen := 0
	svc.Subscribe("task.*", func(evt map[string]any) { seen++ })
	svc.Start()
	defer svc.Stop()
	if _, err := svc.Publish(map[string]any{
		"spec_version": "0.2", "id": "evt_a", "type": "task.submitted",
		"source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{},
	}); err != nil {
		t.Fatalf("publish: %v", err)
	}
	if seen != 1 {
		t.Fatalf("expected 1, got %d", seen)
	}
}

func TestRuntimeRejectsInvalid(t *testing.T) {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = false
	svc := NewRuntimeService(c)
	svc.Start()
	defer svc.Stop()
	if _, err := svc.Publish(map[string]any{"type": "task.submitted"}); err == nil {
		t.Fatal("expected error for invalid event")
	}
}

func TestRuntimeAPIEndpoints(t *testing.T) {
	port := freePort(t)
	svc := NewRuntimeService(memoryAPIConfig(port))
	svc.Start()
	defer svc.Stop()
	time.Sleep(200 * time.Millisecond)
	base := fmt.Sprintf("http://127.0.0.1:%d/harmovela/api", port)

	resp, err := http.Get(base + "/healthz")
	if err != nil {
		t.Fatalf("healthz: %v", err)
	}
	var health map[string]any
	json.NewDecoder(resp.Body).Decode(&health)
	resp.Body.Close()
	if health["status"] != "ok" {
		t.Fatalf("expected ok, got %v", health["status"])
	}

	body := `{"spec_version":"0.2","id":"evt_api","type":"task.submitted","source":"t","created_at":"2026-07-11T10:00:00Z","payload":{}}`
	resp, err = http.Post(base+"/events", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("post events: %v", err)
	}
	if resp.StatusCode != 202 {
		t.Fatalf("expected 202, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	resp, _ = http.Get(base + "/pending")
	var pending map[string]any
	json.NewDecoder(resp.Body).Decode(&pending)
	resp.Body.Close()
	if pending["pending"].(float64) != 1 {
		t.Fatalf("expected 1 pending, got %v", pending["pending"])
	}

	resp, _ = http.Post(base+"/events", "application/json", strings.NewReader(`{"type":"task.submitted"}`))
	if resp.StatusCode != 400 {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	resp, _ = http.Get(base + "/nope")
	if resp.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}

func freePort(t *testing.T) int {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}
