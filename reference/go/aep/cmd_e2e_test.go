package aep

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestDaemonServiceHTTPRoundTrip(t *testing.T) {
	port := freePort(t)
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = true
	c.Transports.API.Host = "127.0.0.1"
	c.Transports.API.Port = port

	svc := NewRuntimeService(c)
	if err := svc.Start(); err != nil {
		t.Fatalf("start: %v", err)
	}
	defer svc.Stop()
	time.Sleep(200 * time.Millisecond)

	base := fmt.Sprintf("http://127.0.0.1:%d/aep/api", port)
	body := `{"aep_version":"0.1","id":"evt_daemon","type":"task.submitted","source":"t","created_at":"2026-07-11T10:00:00Z","payload":{}}`
	resp, err := http.Post(base+"/events", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != 202 {
		t.Fatalf("expected 202, got %d", resp.StatusCode)
	}

	resp, _ = http.Get(base + "/pending")
	var pending map[string]any
	json.NewDecoder(resp.Body).Decode(&pending)
	resp.Body.Close()
	if pending["pending"].(float64) != 1 {
		t.Fatalf("expected 1 pending, got %v", pending["pending"])
	}
}
