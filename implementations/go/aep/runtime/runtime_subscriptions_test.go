package runtime

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

func subApiConfig(port int) RuntimeConfig {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = true
	c.Transports.API.Host = "127.0.0.1"
	c.Transports.API.Port = port
	return c
}

func TestRuntimeSubscriptionRegistry(t *testing.T) {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = false
	svc := NewRuntimeService(c)
	svc.Start()
	defer svc.Stop()
	record := svc.CreateSubscription(map[string]any{"types": "task.*"})
	id := record["id"].(string)
	svc.Publish(map[string]any{"spec_version": "0.2", "id": "evt_match", "type": "task.submitted", "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{}})
	svc.Publish(map[string]any{"spec_version": "0.2", "id": "evt_skip", "type": "session.opened", "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{}})
	drained := svc.TakeEvents(id, 100)
	if len(drained) != 1 {
		t.Fatalf("expected 1, got %d", len(drained))
	}
	if drained[0]["id"] != "evt_match" {
		t.Fatalf("expected evt_match, got %v", drained[0]["id"])
	}
}

func TestRuntimeSubscriptionEndpoints(t *testing.T) {
	port := freePort(t)
	svc := NewRuntimeService(subApiConfig(port))
	svc.Start()
	defer svc.Stop()
	time.Sleep(200 * time.Millisecond)
	base := fmt.Sprintf("http://127.0.0.1:%d/harmovela/api", port)

	resp, _ := http.Post(base+"/subscriptions", "application/json", strings.NewReader(`{"filter":{"types":"task.*"}}`))
	if resp.StatusCode != 201 {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}
	var created map[string]any
	json.NewDecoder(resp.Body).Decode(&created)
	resp.Body.Close()
	id := created["id"].(string)

	resp, _ = http.Get(base + "/subscriptions")
	var listed map[string]any
	json.NewDecoder(resp.Body).Decode(&listed)
	resp.Body.Close()
	if len(listed["subscriptions"].([]any)) != 1 {
		t.Fatal("expected 1 subscription")
	}

	svc.Publish(map[string]any{"spec_version": "0.2", "id": "evt_lp", "type": "task.submitted", "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{}})
	resp, _ = http.Get(base + "/subscriptions/" + id + "/events")
	var lp map[string]any
	json.NewDecoder(resp.Body).Decode(&lp)
	resp.Body.Close()
	if len(lp["events"].([]any)) != 1 {
		t.Fatalf("expected 1 event, got %v", lp["events"])
	}

	req, _ := http.NewRequest(http.MethodDelete, base+"/subscriptions/"+id, nil)
	resp, _ = http.DefaultClient.Do(req)
	resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200 delete, got %d", resp.StatusCode)
	}

	resp, _ = http.Get(base + "/subscriptions/" + id)
	resp.Body.Close()
	if resp.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestRuntimeSubscriptionSSE(t *testing.T) {
	port := freePort(t)
	svc := NewRuntimeService(subApiConfig(port))
	svc.Start()
	defer svc.Stop()
	time.Sleep(200 * time.Millisecond)
	base := fmt.Sprintf("http://127.0.0.1:%d/harmovela/api", port)

	resp, _ := http.Post(base+"/subscriptions", "application/json", strings.NewReader(`{"filter":{"types":"task.*"}}`))
	var created map[string]any
	json.NewDecoder(resp.Body).Decode(&created)
	resp.Body.Close()
	id := created["id"].(string)

	streamResp, err := http.Get(base + "/subscriptions/" + id + "/stream")
	if err != nil {
		t.Fatalf("stream: %v", err)
	}
	defer streamResp.Body.Close()

	time.Sleep(100 * time.Millisecond)
	svc.Publish(map[string]any{"spec_version": "0.2", "id": "evt_sse", "type": "task.submitted", "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{}})

	reader := bufio.NewReader(streamResp.Body)
	done := make(chan string, 1)
	go func() {
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				return
			}
			if strings.HasPrefix(line, "data: ") {
				done <- line
				return
			}
		}
	}()
	select {
	case line := <-done:
		if !strings.Contains(line, "evt_sse") {
			t.Fatalf("expected evt_sse, got %s", line)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("timed out waiting for SSE event")
	}
}
