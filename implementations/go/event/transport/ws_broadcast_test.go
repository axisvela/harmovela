package transport

import (
	"encoding/json"
	"fmt"
	"net"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func freePort(t *testing.T) int {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}

func TestWsBroadcastDeliversToClients(t *testing.T) {
	port := freePort(t)
	server := NewWsBroadcastServer("/harmovela")
	server.OnMessage(func(event map[string]any) {})
	go server.Start(fmt.Sprintf("127.0.0.1:%d", port))
	defer server.Stop()
	time.Sleep(200 * time.Millisecond)

	url := fmt.Sprintf("ws://127.0.0.1:%d/harmovela", port)
	sub, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial sub: %v", err)
	}
	defer sub.Close()
	time.Sleep(100 * time.Millisecond)

	server.Broadcast(map[string]any{"id": "evt_b", "type": "task.submitted"})

	sub.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := sub.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var event map[string]any
	json.Unmarshal(msg, &event)
	if event["id"] != "evt_b" {
		t.Fatalf("expected evt_b, got %v", event["id"])
	}
}

func TestWsBroadcastSubscriptionReplaysAndAcks(t *testing.T) {
	port := freePort(t)
	server := NewWsBroadcastServer("/harmovela")
	server.OnMessage(func(event map[string]any) {})
	server.OnReplay(func(fromCursor string, filter map[string]any, limit int) []map[string]any {
		events := []map[string]any{
			{"id": "evt_1", "type": "task.submitted", "delivery": map[string]any{"cursor": "stream_01:1"}},
			{"id": "evt_2", "type": "task.completed", "delivery": map[string]any{"cursor": "stream_01:2"}},
		}
		if fromCursor == "stream_01:1" {
			return events[1:]
		}
		return events
	})
	acked := make(chan string, 1)
	server.OnAck(func(consumerID, eventID, cursor string) (AckResult, error) {
		acked <- consumerID + ":" + eventID + ":" + cursor
		return AckResult{LatestCursor: "stream_01:2", Lag: 0}, nil
	})
	go server.Start(fmt.Sprintf("127.0.0.1:%d", port))
	defer server.Stop()
	time.Sleep(200 * time.Millisecond)

	url := fmt.Sprintf("ws://127.0.0.1:%d/harmovela", port)
	client, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer client.Close()
	subscription, _ := json.Marshal(map[string]any{
		"type": "subscription.requested",
		"payload": map[string]any{
			"consumer_id": "rheovela/acme/ws/opencode.observation",
			"types":       []string{"task.*"},
			"from_cursor": "",
		},
	})
	if err := client.WriteMessage(websocket.TextMessage, subscription); err != nil {
		t.Fatal(err)
	}

	for _, want := range []string{"evt_1", "evt_2"} {
		client.SetReadDeadline(time.Now().Add(2 * time.Second))
		_, message, err := client.ReadMessage()
		if err != nil {
			t.Fatalf("read %s: %v", want, err)
		}
		var event map[string]any
		json.Unmarshal(message, &event)
		if event["id"] != want {
			t.Fatalf("event = %v, want %s", event["id"], want)
		}
	}

	ack, _ := json.Marshal(map[string]any{
		"type": "event.acknowledged",
		"payload": map[string]any{
			"consumer_id":           "rheovela/acme/ws/opencode.observation",
			"acknowledged_event_id": "evt_2",
			"cursor":                "stream_01:2",
		},
	})
	if err := client.WriteMessage(websocket.TextMessage, ack); err != nil {
		t.Fatal(err)
	}
	select {
	case got := <-acked:
		if got != "rheovela/acme/ws/opencode.observation:evt_2:stream_01:2" {
			t.Fatalf("ack = %q", got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for ack")
	}

	client.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, message, err := client.ReadMessage()
	if err != nil {
		t.Fatalf("read ack response: %v", err)
	}
	var response map[string]any
	json.Unmarshal(message, &response)
	payload := response["payload"].(map[string]any)
	if response["type"] != "event.acknowledged" || payload["lag"] != float64(0) {
		t.Fatalf("ack response = %#v", response)
	}
}

func TestWsBroadcastReceivesFromClient(t *testing.T) {
	port := freePort(t)
	server := NewWsBroadcastServer("/harmovela")
	received := make(chan map[string]any, 1)
	server.OnMessage(func(event map[string]any) {
		received <- event
	})
	go server.Start(fmt.Sprintf("127.0.0.1:%d", port))
	defer server.Stop()
	time.Sleep(200 * time.Millisecond)

	url := fmt.Sprintf("ws://127.0.0.1:%d/harmovela", port)
	client, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer client.Close()
	client.WriteMessage(websocket.TextMessage, []byte(`{"id":"evt_in","type":"task.submitted"}`))

	select {
	case event := <-received:
		if event["id"] != "evt_in" {
			t.Fatalf("expected evt_in, got %v", event["id"])
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for inbound event")
	}
}
