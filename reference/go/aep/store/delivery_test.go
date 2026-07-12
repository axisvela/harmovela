package store

import (
	"testing"
)

func TestRetryDelayComputed(t *testing.T) {
	if got := RetryDelay(1, nil); got != 1000 {
		t.Fatalf("expected 1000, got %d", got)
	}
	if got := RetryDelay(2, nil); got != 2000 {
		t.Fatalf("expected 2000, got %d", got)
	}
	if got := RetryDelay(3, nil); got != 4000 {
		t.Fatalf("expected 4000, got %d", got)
	}
	if got := RetryDelay(4, nil); got != 8000 {
		t.Fatalf("expected 8000, got %d", got)
	}
}

func TestRetryDelayMax(t *testing.T) {
	delay := RetryDelay(20, nil)
	if delay != 30000 {
		t.Fatalf("expected 30000, got %d", delay)
	}
}

func TestDeliveryTracker_TrackSequences(t *testing.T) {
	tracker := NewDeliveryTracker(nil, nil)

	if got := tracker.Track("evt_a", "_default"); got != 1 {
		t.Fatalf("expected 1, got %d", got)
	}
	if got := tracker.Track("evt_b", "_default"); got != 2 {
		t.Fatalf("expected 2, got %d", got)
	}
	if got := tracker.Track("evt_c", "_default"); got != 3 {
		t.Fatalf("expected 3, got %d", got)
	}
}

func TestDeliveryTracker_AckEvents(t *testing.T) {
	tracker := NewDeliveryTracker(nil, nil)
	tracker.Track("evt_a", "_default")
	tracker.Track("evt_b", "_default")
	tracker.Track("evt_c", "_default")

	tracker.Ack("evt_a")
	if !tracker.IsAcknowledged("evt_a") {
		t.Fatal("expected evt_a to be acknowledged")
	}
	if tracker.IsPending("evt_a") {
		t.Fatal("expected evt_a not to be pending")
	}

	tracker.Ack("evt_b")
	if !tracker.IsAcknowledged("evt_b") {
		t.Fatal("expected evt_b to be acknowledged")
	}

	if !tracker.IsPending("evt_c") {
		t.Fatal("expected evt_c to be pending")
	}
	stats := tracker.GetStats()
	if stats["pending"] != 1 {
		t.Fatalf("expected pending 1, got %v", stats["pending"])
	}
	if stats["acknowledged"] != 2 {
		t.Fatalf("expected acknowledged 2, got %v", stats["acknowledged"])
	}
}

func TestDeliveryTracker_NackRetries(t *testing.T) {
	tracker := NewDeliveryTracker(nil, nil)
	tracker.Track("evt_retry", "_default")

	attempts, ok := tracker.Nack("evt_retry")
	if !ok {
		t.Fatal("expected nack to succeed")
	}
	if attempts != 2 {
		t.Fatalf("expected attempts 2, got %d", attempts)
	}

	pending := tracker.GetPending()
	if len(pending) != 1 {
		t.Fatalf("expected 1 pending, got %d", len(pending))
	}
	if pending[0]["attempts"] != 2 {
		t.Fatalf("expected 2 attempts, got %v", pending[0]["attempts"])
	}

	if !tracker.HasAttemptsRemaining("evt_retry", 3) {
		t.Fatal("expected attempts remaining")
	}

	tracker.Nack("evt_retry")
	if tracker.HasAttemptsRemaining("evt_retry", 3) {
		t.Fatal("expected no attempts remaining after 3 attempts")
	}
}

func TestDeliveryTracker_DeadLetter(t *testing.T) {
	tracker := NewDeliveryTracker(nil, nil)
	tracker.Track("evt_dl", "_default")

	tracker.Nack("evt_dl")
	tracker.Nack("evt_dl")

	dlEvent := tracker.DeadLetter("evt_dl", map[string]any{
		"error": map[string]any{
			"code":    "session_timeout",
			"message": "consumer unresponsive",
		},
	})

	if dlEvent == nil {
		t.Fatal("expected deadLetter to return event")
	}
	if dlEvent["type"] != "event.dead_lettered" {
		t.Fatalf("expected event.dead_lettered, got %v", dlEvent["type"])
	}

	payload, ok := dlEvent["payload"].(map[string]any)
	if !ok {
		t.Fatal("expected payload in deadLetter event")
	}
	if payload["original_event_id"] != "evt_dl" {
		t.Fatalf("expected evt_dl, got %v", payload["original_event_id"])
	}
	if payload["attempts"] != 3 {
		t.Fatalf("expected attempts 3, got %v", payload["attempts"])
	}
	errObj, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatal("expected error in payload")
	}
	if errObj["code"] != "session_timeout" {
		t.Fatalf("expected session_timeout, got %v", errObj["code"])
	}

	if tracker.IsPending("evt_dl") {
		t.Fatal("expected evt_dl not to be pending")
	}
	stats := tracker.GetStats()
	if stats["deadLettered"] != 1 {
		t.Fatalf("expected deadLettered 1, got %v", stats["deadLettered"])
	}
}

func TestDeliveryTracker_GetPendingForSubscriptionFilters(t *testing.T) {
	tracker := NewDeliveryTracker(nil, nil)
	tracker.Track("evt_1", "sub_a")
	tracker.Track("evt_2", "sub_b")
	tracker.Track("evt_3", "sub_a")

	filtered := tracker.GetPendingForSubscription("sub_a")
	if len(filtered) != 2 {
		t.Fatalf("expected 2 pending for sub_a, got %d", len(filtered))
	}

	found := make(map[string]bool)
	for _, e := range filtered {
		found[e["eventId"].(string)] = true
	}
	if !found["evt_1"] || !found["evt_3"] {
		t.Fatal("expected evt_1 and evt_3 in filtered results")
	}
	if found["evt_2"] {
		t.Fatal("expected evt_2 not in filtered results")
	}
}

func TestDeliveryTracker_StatsReports(t *testing.T) {
	tracker := NewDeliveryTracker(nil, nil)
	tracker.Track("evt_stats_1", "_default")
	tracker.Track("evt_stats_2", "_default")
	tracker.Track("evt_stats_3", "_default")

	tracker.Ack("evt_stats_1")
	tracker.Nack("evt_stats_3")
	tracker.Nack("evt_stats_3")
	tracker.DeadLetter("evt_stats_3", map[string]any{})

	stats := tracker.GetStats()
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

func TestDeliveryTracker_UsesProvidedStoreAndJournal(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")
	journal := NewDeliveryJournal("stream_01")
	tracker := NewDeliveryTracker(store, journal)

	seq := tracker.Track("evt_store_001", "_default")
	if seq != 1 {
		t.Fatalf("expected seq 1, got %d", seq)
	}
	if !store.IsPending("evt_store_001") {
		t.Fatal("expected store to have evt_store_001 pending")
	}

	tracker.Ack("evt_store_001")
	if !store.IsAcknowledged("evt_store_001") {
		t.Fatal("expected store to have evt_store_001 acknowledged")
	}

	journal.Append(map[string]any{"type": "task.submitted"})
	journalStats := journal.GetStats()
	if journalStats["totalEvents"] != 2 {
		t.Fatalf("expected 2 journal events (track + append), got %v", journalStats["totalEvents"])
	}

	trackerStats := tracker.GetStats()
	if trackerStats["pending"] != 0 {
		t.Fatalf("expected pending 0, got %v", trackerStats["pending"])
	}
	if trackerStats["acknowledged"] != 1 {
		t.Fatalf("expected acknowledged 1, got %v", trackerStats["acknowledged"])
	}
}
