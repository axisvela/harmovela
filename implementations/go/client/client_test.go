package client_test

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/axisvela/harmovela/implementations/go/v3/client"
	"github.com/axisvela/harmovela/implementations/go/v3/runtime"
)

func startRuntime(t *testing.T) (*runtime.RuntimeService, *client.Client) {
	t.Helper()
	config := runtime.DefaultConfig()
	config.Delivery.Store = "memory"
	config.Transports.WebSocket.Enabled = false
	config.Transports.SSE.Enabled = false
	config.Transports.API.Enabled = true
	config.Transports.API.Host = "127.0.0.1"
	config.Transports.API.Port = 0
	config.Transports.API.Path = "/harmovela/api"
	service := runtime.NewRuntimeService(config)
	if err := service.Start(); err != nil {
		t.Fatalf("start runtime: %v", err)
	}
	t.Cleanup(service.Stop)
	sdk := client.NewWithPath(
		fmt.Sprintf("http://127.0.0.1:%d", service.APIPort()),
		"/harmovela/api",
	)
	return service, sdk
}

func event(id, kind string) map[string]any {
	return map[string]any{
		"spec_version": "0.2",
		"id":           id,
		"type":         kind,
		"source":       "client-test",
		"created_at":   "2026-11-10T00:00:00Z",
		"payload":      map[string]any{},
	}
}

func TestHealthAndDeliveryInspection(t *testing.T) {
	_, sdk := startRuntime(t)
	ctx := context.Background()
	health, err := sdk.Health(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if health["status"] != "ok" {
		t.Fatalf("unexpected health: %v", health)
	}
	accepted, err := sdk.Publish(ctx, event("evt_health", "task.submitted"))
	if err != nil {
		t.Fatal(err)
	}
	if accepted["accepted"] != true || accepted["id"] != "evt_health" {
		t.Fatalf("unexpected publish response: %v", accepted)
	}
	stats, err := sdk.Stats(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if stats["pending"] != float64(1) {
		t.Fatalf("expected pending 1, got %v", stats["pending"])
	}
	pending, err := sdk.Pending(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if pending["pending"] != float64(1) {
		t.Fatalf("expected pending 1, got %v", pending["pending"])
	}
}

func TestInvalidEventRejectedLocally(t *testing.T) {
	_, sdk := startRuntime(t)
	_, err := sdk.Publish(context.Background(), map[string]any{"type": "task.submitted"})
	var invalid *client.InvalidEventError
	if !errors.As(err, &invalid) {
		t.Fatalf("expected InvalidEventError, got %T %v", err, err)
	}
	if len(invalid.Errors) == 0 {
		t.Fatal("expected validation errors")
	}
}

func TestSubscriptionLifecycleAndPoll(t *testing.T) {
	_, sdk := startRuntime(t)
	ctx := context.Background()
	created, err := sdk.CreateSubscription(ctx, map[string]any{"types": "task.*"})
	if err != nil {
		t.Fatal(err)
	}
	id := created["id"].(string)
	list, err := sdk.ListSubscriptions(ctx)
	if err != nil || len(list) != 1 {
		t.Fatalf("list subscriptions: %v %v", list, err)
	}
	if _, err := sdk.Publish(ctx, event("evt_match", "task.completed")); err != nil {
		t.Fatal(err)
	}
	if _, err := sdk.Publish(ctx, event("evt_skip", "session.opened")); err != nil {
		t.Fatal(err)
	}
	events, err := sdk.Poll(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 || events[0]["id"] != "evt_match" {
		t.Fatalf("unexpected poll events: %v", events)
	}
	if _, err := sdk.DeleteSubscription(ctx, id); err != nil {
		t.Fatal(err)
	}
	if _, err := sdk.GetSubscription(ctx, id); err == nil {
		t.Fatal("expected 404 after delete")
	}
}

func TestStreamDeliversLiveEvent(t *testing.T) {
	_, sdk := startRuntime(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	created, err := sdk.CreateSubscription(ctx, map[string]any{"types": "task.*"})
	if err != nil {
		t.Fatal(err)
	}
	id := created["id"].(string)
	received := make(chan map[string]any, 1)
	errs := make(chan error, 1)
	go func() {
		errs <- sdk.Stream(ctx, id, func(value map[string]any) {
			select {
			case received <- value:
			default:
			}
		})
	}()
	time.Sleep(100 * time.Millisecond)
	if _, err := sdk.Publish(ctx, event("evt_stream", "task.completed")); err != nil {
		t.Fatal(err)
	}
	select {
	case value := <-received:
		if value["id"] != "evt_stream" {
			t.Fatalf("unexpected stream event: %v", value)
		}
	case err := <-errs:
		t.Fatalf("stream ended: %v", err)
	case <-ctx.Done():
		t.Fatal("timed out waiting for stream event")
	}
}
