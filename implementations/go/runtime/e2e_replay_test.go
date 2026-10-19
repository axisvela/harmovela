package runtime

import (
	"encoding/json"
	"fmt"
	"net"
	"path/filepath"
	"sync"
	"testing"
	"time"

	hmevent "github.com/axisvela/harmovela/v3/event"
	hmtransport "github.com/axisvela/harmovela/v3/event/transport"
)

type replayTestConsumer struct {
	id       string
	mu       sync.Mutex
	inbox    map[string]bool
	handled  []string
	received int
	cursor   string
}

func newReplayTestConsumer(id string) *replayTestConsumer {
	return &replayTestConsumer{id: id, inbox: map[string]bool{}}
}

func (c *replayTestConsumer) connect(t *testing.T, url string) *hmtransport.WsClient {
	t.Helper()
	client := hmtransport.NewWsClient()
	client.OnMessage(func(msg *hmtransport.Message) {
		var event map[string]any
		if err := json.Unmarshal([]byte(msg.JsonPayload), &event); err != nil {
			return
		}
		c.handle(client, event)
	})
	if err := client.Connect(url); err != nil {
		t.Fatalf("connect: %v", err)
	}
	c.mu.Lock()
	fromCursor := c.cursor
	c.mu.Unlock()
	subscription, _ := json.Marshal(map[string]any{
		"type": "subscription.requested",
		"payload": map[string]any{
			"consumer_id":   c.id,
			"types":         []string{"task.*"},
			"topic":         "opencode.observation",
			"tenant_id":     "acme",
			"workspace_id":  "ws",
			"from_cursor":   fromCursor,
			"delivery_mode": "replayable",
		},
	})
	if err := client.Send(&hmtransport.Message{JsonPayload: string(subscription)}); err != nil {
		client.Close()
		t.Fatalf("subscribe: %v", err)
	}
	return client
}

func (c *replayTestConsumer) handle(client *hmtransport.WsClient, event map[string]any) {
	if event["type"] == "event.acknowledged" {
		return
	}
	eventID, _ := event["id"].(string)
	delivery, _ := event["delivery"].(map[string]any)
	cursor, _ := delivery["cursor"].(string)

	c.mu.Lock()
	c.received++
	seen := c.inbox[eventID]
	if !seen {
		c.inbox[eventID] = true
		c.handled = append(c.handled, eventID)
	}
	if cursor != "" {
		c.cursor = cursor
	}
	c.mu.Unlock()

	if cursor == "" {
		return
	}
	ack, _ := json.Marshal(map[string]any{
		"spec_version": "0.2",
		"id":           "ack-" + eventID,
		"type":         "event.acknowledged",
		"source":       "test:consumer",
		"created_at":   time.Now().UTC().Format(time.RFC3339),
		"payload": map[string]any{
			"consumer_id":           c.id,
			"acknowledged_event_id": eventID,
			"cursor":                cursor,
		},
	})
	_ = client.Send(&hmtransport.Message{JsonPayload: string(ack)})
}

func (c *replayTestConsumer) waitFor(t *testing.T, count int) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		c.mu.Lock()
		current := len(c.handled)
		c.mu.Unlock()
		if current >= count {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	c.mu.Lock()
	current := len(c.handled)
	c.mu.Unlock()
	t.Fatalf("consumer %s handled %d events, want %d", c.id, current, count)
}

func (c *replayTestConsumer) count() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.handled)
}

func (c *replayTestConsumer) receivedCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.received
}

func (c *replayTestConsumer) waitForReceived(t *testing.T, count int) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if c.receivedCount() >= count {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("consumer %s received %d deliveries, want %d", c.id, c.receivedCount(), count)
}

func replayFreePort(t *testing.T) int {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port
}

func replayEvent(id string) map[string]any {
	return map[string]any{
		"spec_version": "0.2",
		"id":           id,
		"type":         "task.output",
		"source":       "coordivela:opencode-probe",
		"topic":        "opencode.observation",
		"tenant_id":    "acme",
		"workspace_id": "ws",
		"created_at":   time.Now().UTC().Format(time.RFC3339),
		"payload":      map[string]any{"output": "event " + id},
	}
}

func TestReplayAcrossDisconnectAndRestart(t *testing.T) {
	port := replayFreePort(t)
	cfg := DefaultConfig()
	cfg.Delivery.Store = "sqlite"
	cfg.Delivery.Sqlite = map[string]string{"path": filepath.Join(t.TempDir(), "harmovela.db")}
	cfg.Transports.WebSocket.Host = "127.0.0.1"
	cfg.Transports.WebSocket.Port = port
	cfg.Transports.WebSocket.Path = "/harmovela"
	cfg.Transports.API.Enabled = false
	cfg.Transports.SSE.Enabled = false
	cfg.Transports.Stdio.Enabled = false

	service := NewRuntimeService(cfg)
	if service.eventLog == nil {
		t.Fatal("event log not configured")
	}
	if err := service.Start(); err != nil {
		t.Fatal(err)
	}
	defer service.Stop()
	time.Sleep(200 * time.Millisecond)

	for _, id := range []string{"evt_1", "evt_2", "evt_3"} {
		if _, err := service.Publish(replayEvent(id)); err != nil {
			t.Fatal(err)
		}
	}

	if events := service.eventLog.ReplayEvents("", 10); len(events) != 3 {
		t.Fatalf("event log replay = %d events, want 3", len(events))
	} else {
		filter := map[string]any{"types": []any{"task.*"}, "topic": "opencode.observation"}
		for _, evt := range events {
			if !hmevent.SubscriptionMatches(filter, evt) {
				t.Fatalf("event does not match test filter: %#v", evt)
			}
		}
	}

	url := fmt.Sprintf("ws://127.0.0.1:%d/harmovela", port)
	consumers := []*replayTestConsumer{
		newReplayTestConsumer("coordivela/acme/ws/opencode.observation"),
		newReplayTestConsumer("rheovela/acme/ws/opencode.observation"),
		newReplayTestConsumer("mnemovela/acme/ws/opencode.observation"),
		newReplayTestConsumer("ontovela/acme/ws/opencode.observation"),
	}
	clients := make([]*hmtransport.WsClient, len(consumers))
	for index, consumer := range consumers {
		clients[index] = consumer.connect(t, url)
	}
	for _, consumer := range consumers {
		consumer.waitFor(t, 3)
	}

	clients[3].Close()
	for _, id := range []string{"evt_4", "evt_5"} {
		if _, err := service.Publish(replayEvent(id)); err != nil {
			t.Fatal(err)
		}
	}
	for index := 0; index < 3; index++ {
		consumers[index].waitFor(t, 5)
	}
	if got := consumers[3].count(); got != 3 {
		t.Fatalf("disconnected consumer handled %d events, want 3", got)
	}

	clients[3] = consumers[3].connect(t, url)
	consumers[3].waitFor(t, 5)
	if got := consumers[3].receivedCount(); got != 5 {
		t.Fatalf("reconnected consumer received %d deliveries, want 5 (cursor replay)", got)
	}

	if _, err := service.Publish(replayEvent("evt_5")); err != nil {
		t.Fatal(err)
	}
	for _, consumer := range consumers {
		consumer.waitForReceived(t, 6)
		consumer.waitFor(t, 5)
	}
	for _, consumer := range consumers {
		if got := consumer.count(); got != 5 {
			t.Fatalf("consumer %s handled %d events, want 5", consumer.id, got)
		}
	}

	for index, client := range clients {
		if client != nil {
			client.Close()
		}
		_ = index
	}
}
