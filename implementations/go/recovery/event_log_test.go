package recovery

import (
	"path/filepath"
	"testing"
)

func TestInMemoryEventLogReplayAndAck(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")
	first := map[string]any{"id": "evt_1", "type": "task.submitted"}
	cursor, err := store.RecordEvent(first)
	if err != nil {
		t.Fatal(err)
	}
	if cursor != "stream_01:1" {
		t.Fatalf("cursor = %q", cursor)
	}
	if first["delivery"].(map[string]any)["cursor"] != cursor {
		t.Fatalf("event delivery = %#v", first["delivery"])
	}
	duplicate, err := store.RecordEvent(map[string]any{"id": "evt_1", "type": "task.submitted"})
	if err != nil {
		t.Fatal(err)
	}
	if duplicate != cursor {
		t.Fatalf("duplicate cursor = %q, want %q", duplicate, cursor)
	}
	if _, err := store.RecordEvent(map[string]any{"id": "evt_2", "type": "task.completed"}); err != nil {
		t.Fatal(err)
	}

	replayed := store.ReplayEvents(cursor, 100)
	if len(replayed) != 1 || replayed[0]["id"] != "evt_2" {
		t.Fatalf("replayed = %#v", replayed)
	}
	if err := store.AckConsumer("consumer-1", "evt_2", "stream_01:2"); err != nil {
		t.Fatal(err)
	}
	if got, ok := store.ConsumerCursor("consumer-1"); !ok || got != "stream_01:2" {
		t.Fatalf("consumer cursor = %q ok=%v", got, ok)
	}
	if got := store.LastCursor(); got != "stream_01:2" {
		t.Fatalf("last cursor = %q", got)
	}
}

func TestEventLogPrune(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")
	for _, id := range []string{"evt_1", "evt_2", "evt_3"} {
		if _, err := store.RecordEvent(map[string]any{"id": id, "type": "task.output"}); err != nil {
			t.Fatal(err)
		}
	}
	removed, err := store.PruneEvents("stream_01:2")
	if err != nil {
		t.Fatal(err)
	}
	if removed != 2 {
		t.Fatalf("removed = %d, want 2", removed)
	}
	replayed := store.ReplayEvents("", 100)
	if len(replayed) != 1 || replayed[0]["id"] != "evt_3" {
		t.Fatalf("replayed = %#v", replayed)
	}
}

func TestSqliteEventLogSurvivesReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "events.db")
	store, err := NewSqliteDeliveryStore(path, "stream_01")
	if err != nil {
		t.Fatal(err)
	}
	cursor, err := store.RecordEvent(map[string]any{"id": "evt_1", "type": "task.submitted"})
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Close(); err != nil {
		t.Fatal(err)
	}

	store, err = NewSqliteDeliveryStore(path, "stream_01")
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	replayed := store.ReplayEvents("", 100)
	if len(replayed) != 1 || replayed[0]["id"] != "evt_1" {
		t.Fatalf("replayed = %#v", replayed)
	}
	if got := deliveryCursor(replayed[0]); got != cursor {
		t.Fatalf("cursor = %q, want %q", got, cursor)
	}
	if err := store.AckConsumer("consumer-1", "evt_1", cursor); err != nil {
		t.Fatal(err)
	}
	if got, ok := store.ConsumerCursor("consumer-1"); !ok || got != cursor {
		t.Fatalf("consumer cursor = %q ok=%v", got, ok)
	}
}

func TestPostgresEventLogReplayAndAck(t *testing.T) {
	store := newTestPgStore(t)
	defer store.Close()

	cursor, err := store.RecordEvent(map[string]any{"id": "evt_pg_1", "type": "task.submitted"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.RecordEvent(map[string]any{"id": "evt_pg_2", "type": "task.completed"}); err != nil {
		t.Fatal(err)
	}
	replayed := store.ReplayEvents(cursor, 100)
	if len(replayed) != 1 || replayed[0]["id"] != "evt_pg_2" {
		t.Fatalf("replayed = %#v", replayed)
	}
	if err := store.AckConsumer("consumer-1", "evt_pg_2", "stream_01:2"); err != nil {
		t.Fatal(err)
	}
	if got, ok := store.ConsumerCursor("consumer-1"); !ok || got != "stream_01:2" {
		t.Fatalf("consumer cursor = %q ok=%v", got, ok)
	}
	if got := store.LastCursor(); got != "stream_01:2" {
		t.Fatalf("last cursor = %q", got)
	}
}

func deliveryCursor(event map[string]any) string {
	delivery, _ := event["delivery"].(map[string]any)
	cursor, _ := delivery["cursor"].(string)
	return cursor
}
