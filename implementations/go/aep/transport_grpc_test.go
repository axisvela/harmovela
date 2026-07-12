package aep

import (
	"context"
	"fmt"
	"net"
	"sync"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func TestGrpcServerStartsOnRandomPort(t *testing.T) {
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}
	defer lis.Close()

	addr := lis.Addr().String()
	if addr == "" {
		t.Fatal("expected non-empty address")
	}

	srv := NewGrpcServer()
	go func() {
		if err := srv.Start(lis); err != nil {
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

func TestGrpcClientConnectsAndExchangesMessages(t *testing.T) {
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}

	srv := NewGrpcServer()
	srv.OnMessage(func(msg *HarmovelaMessage) *HarmovelaMessage {
		return msg
	})

	go srv.Start(lis)
	defer srv.Stop()
	time.Sleep(50 * time.Millisecond)

	addr := lis.Addr().String()
	client := NewGrpcClient()
	if err := client.Connect(addr); err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer client.Close()

	received := make(chan *HarmovelaMessage, 1)
	client.OnMessage(func(msg *HarmovelaMessage) {
		received <- msg
	})

	testMsg := &HarmovelaMessage{JsonPayload: `{"type":"test","id":"001"}`}
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

func TestGrpcBidirectionalStreaming(t *testing.T) {
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}

	srv := NewGrpcServer()
	var serverReceived []*HarmovelaMessage
	var mu sync.Mutex
	srv.OnMessage(func(msg *HarmovelaMessage) *HarmovelaMessage {
		mu.Lock()
		serverReceived = append(serverReceived, msg)
		mu.Unlock()
		return &HarmovelaMessage{JsonPayload: fmt.Sprintf(`{"echo":"%s"}`, msg.JsonPayload)}
	})

	go srv.Start(lis)
	defer srv.Stop()
	time.Sleep(50 * time.Millisecond)

	addr := lis.Addr().String()
	client := NewGrpcClient()
	if err := client.Connect(addr); err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer client.Close()

	clientReceived := make([]*HarmovelaMessage, 0)
	var clientMu sync.Mutex
	var wg sync.WaitGroup
	wg.Add(3)

	client.OnMessage(func(msg *HarmovelaMessage) {
		clientMu.Lock()
		clientReceived = append(clientReceived, msg)
		clientMu.Unlock()
		wg.Done()
	})

	messages := []*HarmovelaMessage{
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

func TestGrpcServerShutdownStopsCleanly(t *testing.T) {
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}

	srv := NewGrpcServer()
	srv.OnMessage(func(msg *HarmovelaMessage) *HarmovelaMessage {
		return msg
	})

	go srv.Start(lis)
	time.Sleep(50 * time.Millisecond)

	addr := lis.Addr().String()
	client := NewGrpcClient()
	if err := client.Connect(addr); err != nil {
		t.Fatalf("failed to connect: %v", err)
	}

	if err := client.Send(&HarmovelaMessage{JsonPayload: `{"type":"before_stop"}`}); err != nil {
		t.Fatalf("failed to send before stop: %v", err)
	}
	time.Sleep(50 * time.Millisecond)

	client.Close()
	srv.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	_, err = grpc.DialContext(ctx, addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err == nil {
		t.Fatal("expected connection failure after shutdown")
	}
}

