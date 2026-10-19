package runtime

import "testing"

func TestPruneEventsUsesMinimumAcknowledgedCursor(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Delivery.Store = "memory"
	service := NewRuntimeService(cfg)
	if service.eventLog == nil {
		t.Fatal("event log not configured")
	}
	for _, id := range []string{"evt_1", "evt_2", "evt_3"} {
		if _, err := service.eventLog.RecordEvent(map[string]any{"id": id, "type": "task.output"}); err != nil {
			t.Fatal(err)
		}
	}

	service.consumerMu.Lock()
	service.consumers["consumer-1"] = struct{}{}
	service.consumerMu.Unlock()
	service.pruneOnce()
	if events := service.eventLog.ReplayEvents("", 10); len(events) != 3 {
		t.Fatalf("pruned before a cursor was acknowledged: %d events", len(events))
	}

	if err := service.eventLog.AckConsumer("consumer-1", "evt_2", "stream_01:2"); err != nil {
		t.Fatal(err)
	}
	service.pruneOnce()
	events := service.eventLog.ReplayEvents("", 10)
	if len(events) != 1 || events[0]["id"] != "evt_3" {
		t.Fatalf("events after prune = %#v", events)
	}
}

func TestPruneEventsSkipsWhenAConsumerHasNoCursor(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Delivery.Store = "memory"
	service := NewRuntimeService(cfg)
	for _, id := range []string{"evt_1", "evt_2"} {
		if _, err := service.eventLog.RecordEvent(map[string]any{"id": id, "type": "task.output"}); err != nil {
			t.Fatal(err)
		}
	}
	service.consumerMu.Lock()
	service.consumers["consumer-1"] = struct{}{}
	service.consumers["consumer-2"] = struct{}{}
	service.consumerMu.Unlock()
	if err := service.eventLog.AckConsumer("consumer-1", "evt_2", "stream_01:2"); err != nil {
		t.Fatal(err)
	}
	service.pruneOnce()
	if events := service.eventLog.ReplayEvents("", 10); len(events) != 2 {
		t.Fatalf("pruned while a consumer had no cursor: %d events", len(events))
	}
}
