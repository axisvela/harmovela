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
	server := NewWsBroadcastServer("/aep")
	server.OnMessage(func(event map[string]any) {})
	go server.Start(fmt.Sprintf("127.0.0.1:%d", port))
	defer server.Stop()
	time.Sleep(200 * time.Millisecond)

	url := fmt.Sprintf("ws://127.0.0.1:%d/aep", port)
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

func TestWsBroadcastReceivesFromClient(t *testing.T) {
	port := freePort(t)
	server := NewWsBroadcastServer("/aep")
	received := make(chan map[string]any, 1)
	server.OnMessage(func(event map[string]any) {
		received <- event
	})
	go server.Start(fmt.Sprintf("127.0.0.1:%d", port))
	defer server.Stop()
	time.Sleep(200 * time.Millisecond)

	url := fmt.Sprintf("ws://127.0.0.1:%d/aep", port)
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
