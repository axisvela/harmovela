package aep

import (
	"testing"
)

func TestInMemoryDeliveryStore_TrackAndAck(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")

	seq := store.Track("evt_001", "sub_01")
	if seq != 1 {
		t.Fatalf("expected sequence 1, got %d", seq)
	}

	if !store.IsPending("evt_001") {
		t.Fatal("expected event to be pending")
	}
	if store.IsAcknowledged("evt_001") {
		t.Fatal("expected event not to be acknowledged")
	}

	acked := store.Ack("evt_001")
	if !acked {
		t.Fatal("expected ack to succeed")
	}
	if !store.IsAcknowledged("evt_001") {
		t.Fatal("expected event to be acknowledged")
	}
	if store.IsPending("evt_001") {
		t.Fatal("expected event not to be pending after ack")
	}
}

func TestInMemoryDeliveryStore_NackIncrements(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")

	store.Track("evt_001", "sub_01")
	attempts, ok := store.Nack("evt_001")
	if !ok {
		t.Fatal("expected nack to succeed")
	}
	if attempts != 2 {
		t.Fatalf("expected attempts 2, got %d", attempts)
	}

	pending := store.GetPending()
	if len(pending) != 1 {
		t.Fatalf("expected 1 pending, got %d", len(pending))
	}
	if pending[0]["attempts"] != 2 {
		t.Fatalf("expected pending attempts 2, got %v", pending[0]["attempts"])
	}
}

func TestInMemoryDeliveryStore_DeadLetters(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")

	store.Track("evt_001", "sub_01")
	dlq := store.DeadLetter("evt_001", map[string]any{
		"error": map[string]any{
			"code":    "timeout",
			"message": "no ack",
		},
	})
	if dlq == nil {
		t.Fatal("expected deadLetter to return event")
	}

	payload, ok := dlq["payload"].(map[string]any)
	if !ok {
		t.Fatal("expected deadLetter payload")
	}
	if payload["attempts"] != 1 {
		t.Fatalf("expected attempts 1, got %v", payload["attempts"])
	}
	if payload["original_event_id"] != "evt_001" {
		t.Fatalf("expected original_event_id evt_001, got %v", payload["original_event_id"])
	}
	if store.IsPending("evt_001") {
		t.Fatal("expected event not to be pending after deadLetter")
	}
}

func TestInMemoryDeliveryStore_Stats(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")

	store.Track("evt_a", "sub_01")
	store.Track("evt_b", "sub_01")
	store.Ack("evt_a")
	store.Track("evt_c", "sub_02")
	store.DeadLetter("evt_c", map[string]any{})

	stats := store.GetStats()
	if stats["totalSequences"] != 3 {
		t.Fatalf("expected totalSequences 3, got %v", stats["totalSequences"])
	}
	if stats["pending"] != 1 {
		t.Fatalf("expected pending 1, got %v", stats["pending"])
	}
	if stats["acknowledged"] != 1 {
		t.Fatalf("expected acknowledged 1, got %v", stats["acknowledged"])
	}
	if stats["deadLettered"] != 1 {
		t.Fatalf("expected deadLettered 1, got %v", stats["deadLettered"])
	}
}

func TestInMemoryDeliveryStore_NackReturnsFalseForUnknown(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")

	_, ok := store.Nack("nonexistent")
	if ok {
		t.Fatal("expected nack to return false for unknown event")
	}
}

func TestInMemoryDeliveryStore_DeadLetterReturnsNilForUnknown(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")

	dlq := store.DeadLetter("nonexistent", nil)
	if dlq != nil {
		t.Fatal("expected deadLetter to return nil for unknown event")
	}
}

func TestInMemoryDeliveryStore_HasAttemptsRemaining(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")

	store.Track("evt_001", "sub_01")
	if !store.HasAttemptsRemaining("evt_001", 3) {
		t.Fatal("expected attempts remaining with max 3 and 1 attempt")
	}
	store.Nack("evt_001")
	store.Nack("evt_001")
	if store.HasAttemptsRemaining("evt_001", 3) {
		t.Fatal("expected no attempts remaining with max 3 and 3 attempts")
	}
}

func TestInMemoryDeliveryStore_GetPendingForSubscriptionFilters(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")

	store.Track("evt_a", "sub_01")
	store.Track("evt_b", "sub_02")
	store.Track("evt_c", "sub_01")

	filtered := store.GetPendingForSubscription("sub_01")
	if len(filtered) != 2 {
		t.Fatalf("expected 2 pending for sub_01, got %d", len(filtered))
	}

	found := make(map[string]bool)
	for _, e := range filtered {
		found[e["eventId"].(string)] = true
	}
	if !found["evt_a"] || !found["evt_c"] {
		t.Fatalf("expected evt_a and evt_c in filtered results, got %v", found)
	}
	if found["evt_b"] {
		t.Fatal("expected evt_b not in filtered results")
	}
}
