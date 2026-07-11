package aep

import (
	"fmt"
	"math/rand"
	"os"
	"testing"
)

func pgURL() string {
	if v := os.Getenv("AEP_POSTGRES_URL"); v != "" {
		return v
	}
	return "postgres://postgres:postgres@localhost:5433/postgres"
}

func newTestPgStore(t *testing.T) *PostgresDeliveryStore {
	t.Helper()
	prefix := fmt.Sprintf("test_%d", rand.Int63())
	store, err := NewPostgresDeliveryStore(pgURL(), "stream_01", PostgresOptions{
		TablePrefix: prefix,
		DropOnClose: true,
	})
	if err != nil {
		t.Fatalf("connect postgres: %v", err)
	}
	return store
}

func TestPostgresTrackAndAck(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	seq := store.Track("evt_001", "sub_01")
	if seq != 1 {
		t.Fatalf("expected seq 1, got %d", seq)
	}
	if !store.IsPending("evt_001") {
		t.Fatal("expected pending")
	}
	if store.IsAcknowledged("evt_001") {
		t.Fatal("should not be acknowledged")
	}
	if !store.Ack("evt_001") {
		t.Fatal("ack should succeed")
	}
	if !store.IsAcknowledged("evt_001") {
		t.Fatal("expected acknowledged")
	}
	if store.IsPending("evt_001") {
		t.Fatal("should not be pending after ack")
	}
}

func TestPostgresNack(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_001", "sub_01")
	attempts, ok := store.Nack("evt_001")
	if !ok || attempts != 2 {
		t.Fatalf("expected attempts 2 ok true, got %d %v", attempts, ok)
	}
}

func TestPostgresDeadLetter(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_001", "sub_01")
	dlq := store.DeadLetter("evt_001", map[string]any{"error": map[string]any{"code": "timeout"}})
	if dlq == nil {
		t.Fatal("expected dead-letter event")
	}
	if dlq["type"] != "event.dead_lettered" {
		t.Fatalf("expected event.dead_lettered, got %v", dlq["type"])
	}
	if store.IsPending("evt_001") {
		t.Fatal("should not be pending after dead-letter")
	}
}

func TestPostgresStats(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_a", "sub_01")
	store.Track("evt_b", "sub_01")
	store.Ack("evt_a")
	store.Track("evt_c", "sub_02")
	store.DeadLetter("evt_c", nil)

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

func TestPostgresGetPendingForSubscription(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_a", "sub_01")
	store.Track("evt_b", "sub_02")
	store.Track("evt_c", "sub_01")
	filtered := store.GetPendingForSubscription("sub_01")
	if len(filtered) != 2 {
		t.Fatalf("expected 2 pending for sub_01, got %d", len(filtered))
	}
}

func TestPostgresHasAttemptsRemaining(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	store.Track("evt_001", "sub_01")
	if !store.HasAttemptsRemaining("evt_001", 3) {
		t.Fatal("expected attempts remaining")
	}
	store.Nack("evt_001")
	store.Nack("evt_001")
	if store.HasAttemptsRemaining("evt_001", 3) {
		t.Fatal("expected no attempts remaining")
	}
}

func TestPostgresImplementsDeliveryStore(t *testing.T) {
	var _ DeliveryStore = (*PostgresDeliveryStore)(nil)
}
