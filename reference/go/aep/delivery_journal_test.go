package aep

import (
	"testing"
)

func TestDeliveryJournalAppend(t *testing.T) {
	journal := NewDeliveryJournal("stream_01")
	seq1 := journal.Append(map[string]any{"type": "task.submitted", "task_id": "task_01"})
	seq2 := journal.Append(map[string]any{"type": "task.completed", "task_id": "task_01"})
	if seq1 != 1 {
		t.Fatalf("expected seq1=1, got %d", seq1)
	}
	if seq2 != 2 {
		t.Fatalf("expected seq2=2, got %d", seq2)
	}
}

func TestDeliveryJournalReplaySinceCursor(t *testing.T) {
	journal := NewDeliveryJournal("stream_01")
	journal.Append(map[string]any{"type": "task.submitted"})
	journal.Append(map[string]any{"type": "task.started"})
	journal.Append(map[string]any{"type": "task.completed"})
	events := journal.Replay("stream_01:1")
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
	if events[0]["type"] != "task.started" {
		t.Fatalf("expected task.started, got %v", events[0]["type"])
	}
	if events[1]["type"] != "task.completed" {
		t.Fatalf("expected task.completed, got %v", events[1]["type"])
	}
}

func TestDeliveryJournalReplayAll(t *testing.T) {
	journal := NewDeliveryJournal("stream_01")
	journal.Append(map[string]any{"type": "task.submitted"})
	journal.Append(map[string]any{"type": "task.started"})
	events := journal.Replay("")
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
}

func TestDeliveryJournalPurge(t *testing.T) {
	journal := NewDeliveryJournal("stream_01")
	journal.Append(map[string]any{"type": "evt_1"})
	journal.Append(map[string]any{"type": "evt_2"})
	journal.Append(map[string]any{"type": "evt_3"})
	removed := journal.Purge("stream_01:2")
	if removed != 2 {
		t.Fatalf("expected removed=2, got %d", removed)
	}
	events := journal.Replay("")
	if len(events) != 1 {
		t.Fatalf("expected 1 event remaining, got %d", len(events))
	}
	if events[0]["type"] != "evt_3" {
		t.Fatalf("expected evt_3, got %v", events[0]["type"])
	}
}

func TestDeliveryJournalStats(t *testing.T) {
	journal := NewDeliveryJournal("stream_01")
	journal.Append(map[string]any{"type": "evt_1"})
	journal.Append(map[string]any{"type": "evt_2"})
	stats := journal.GetStats()
	if stats["totalEvents"] != 2 {
		t.Fatalf("expected totalEvents=2, got %v", stats["totalEvents"])
	}
	if stats["oldestSequence"] != 1 {
		t.Fatalf("expected oldestSequence=1, got %v", stats["oldestSequence"])
	}
	if stats["newestSequence"] != 2 {
		t.Fatalf("expected newestSequence=2, got %v", stats["newestSequence"])
	}
}

func TestDeliveryJournalStatsEmpty(t *testing.T) {
	journal := NewDeliveryJournal("stream_01")
	stats := journal.GetStats()
	if stats["totalEvents"] != 0 {
		t.Fatalf("expected totalEvents=0, got %v", stats["totalEvents"])
	}
	if stats["oldestSequence"] != nil {
		t.Fatalf("expected oldestSequence=nil, got %v", stats["oldestSequence"])
	}
	if stats["newestSequence"] != nil {
		t.Fatalf("expected newestSequence=nil, got %v", stats["newestSequence"])
	}
}
