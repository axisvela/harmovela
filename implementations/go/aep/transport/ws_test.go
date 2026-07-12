package transport

import (
	"fmt"
	"net"
	"sync"
	"testing"
	"time"

	"github.com/axisrobo/aep/aep"
)

func TestWsServerStartsAndIsReachable(t *testing.T) {
	srv := NewWsServer()

	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}
	addr := lis.Addr().String()
	lis.Close()

	go func() {
		if err := srv.Start(addr); err != nil {
			panic(err)
		}
	}()
	defer srv.Stop()

	time.Sleep(50 * time.Millisecond)

	_, err = net.DialTimeout("tcp", addr, time.Second)
	if err != nil {
		t.Fatalf("server not reachable on %s: %v", addr, err)
	}
}

func TestWsClientConnectsAndExchangesMessages(t *testing.T) {
	srv := NewWsServer()
	srv.OnMessage(func(msg *aep.AepMessage) *aep.AepMessage {
		return msg
	})

	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}
	addr := lis.Addr().String()
	lis.Close()

	go srv.Start(addr)
	defer srv.Stop()
	time.Sleep(50 * time.Millisecond)

	client := NewWsClient()
	if err := client.Connect("ws://" + addr + "/ws"); err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer client.Close()

	received := make(chan *aep.AepMessage, 1)
	client.OnMessage(func(msg *aep.AepMessage) {
		received <- msg
	})

	testMsg := &aep.AepMessage{JsonPayload: `{"type":"test","id":"001"}`}
	if err := client.Send(testMsg); err != nil {
		t.Fatalf("failed to send: %v", err)
	}

	select {
	case resp := <-received:
		if resp.JsonPayload != testMsg.JsonPayload {
			t.Fatalf("expected %s, got %s", testMsg.JsonPayload, resp.JsonPayload)
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for response")
	}
}

func TestWsBidirectionalStreaming(t *testing.T) {
	srv := NewWsServer()
	var serverReceived []*aep.AepMessage
	var mu sync.Mutex
	srv.OnMessage(func(msg *aep.AepMessage) *aep.AepMessage {
		mu.Lock()
		serverReceived = append(serverReceived, msg)
		mu.Unlock()
		return &aep.AepMessage{JsonPayload: fmt.Sprintf(`{"echo":"%s"}`, msg.JsonPayload)}
	})

	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}
	addr := lis.Addr().String()
	lis.Close()

	go srv.Start(addr)
	defer srv.Stop()
	time.Sleep(50 * time.Millisecond)

	client := NewWsClient()
	if err := client.Connect("ws://" + addr + "/ws"); err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer client.Close()

	clientReceived := make([]*aep.AepMessage, 0)
	var clientMu sync.Mutex
	var wg sync.WaitGroup
	wg.Add(3)

	client.OnMessage(func(msg *aep.AepMessage) {
		clientMu.Lock()
		clientReceived = append(clientReceived, msg)
		clientMu.Unlock()
		wg.Done()
	})

	messages := []*aep.AepMessage{
		{JsonPayload: `{"type":"msg1"}`},
		{JsonPayload: `{"type":"msg2"}`},
		{JsonPayload: `{"type":"msg3"}`},
	}

	for _, msg := range messages {
		if err := client.Send(msg); err != nil {
			t.Fatalf("failed to send: %v", err)
		}
	}

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for bidirectional responses")
	}

	mu.Lock()
	if len(serverReceived) != 3 {
		t.Fatalf("server expected 3 messages, got %d", len(serverReceived))
	}
	mu.Unlock()

	clientMu.Lock()
	if len(clientReceived) != 3 {
		t.Fatalf("client expected 3 responses, got %d", len(clientReceived))
	}
	clientMu.Unlock()
}

func TestWsServerShutdownStopsCleanly(t *testing.T) {
	srv := NewWsServer()
	srv.OnMessage(func(msg *aep.AepMessage) *aep.AepMessage {
		return msg
	})

	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}
	addr := lis.Addr().String()
	lis.Close()

	go srv.Start(addr)
	time.Sleep(50 * time.Millisecond)

	client := NewWsClient()
	if err := client.Connect("ws://" + addr + "/ws"); err != nil {
		t.Fatalf("failed to connect: %v", err)
	}

	if err := client.Send(&aep.AepMessage{JsonPayload: `{"type":"before_stop"}`}); err != nil {
		t.Fatalf("failed to send before stop: %v", err)
	}
	time.Sleep(50 * time.Millisecond)

	client.Close()
	srv.Stop()

	_, err = net.DialTimeout("tcp", addr, 500*time.Millisecond)
	if err == nil {
		t.Fatal("expected connection failure after shutdown")
	}
}
