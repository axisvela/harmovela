package recovery

import (
	"strconv"
	"strings"
	"sync"
)

// EventLog retains event envelopes for cursor-based replay.
type EventLog interface {
	RecordEvent(event map[string]any) (string, error)
	ReplayEvents(afterCursor string, limit int) []map[string]any
	AckConsumer(consumerID, eventID, cursor string) error
	ConsumerCursor(consumerID string) (string, bool)
	LastCursor() string
	PruneEvents(throughCursor string) (int, error)
}

var (
	_ EventLog = (*InMemoryDeliveryStore)(nil)
	_ EventLog = (*SqliteDeliveryStore)(nil)
	_ EventLog = (*PostgresDeliveryStore)(nil)
)

type loggedEvent struct {
	sequence int
	cursor   string
	event    map[string]any
}

type eventLogState struct {
	mu              sync.Mutex
	streamID        string
	events          []loggedEvent
	eventCursors    map[string]string
	consumerCursors map[string]string
}

func newEventLogState(streamID string) *eventLogState {
	return &eventLogState{
		streamID:        streamID,
		eventCursors:    make(map[string]string),
		consumerCursors: make(map[string]string),
	}
}

func cloneEvent(event map[string]any) map[string]any {
	cloned := make(map[string]any, len(event))
	for key, value := range event {
		cloned[key] = value
	}
	return cloned
}

func withDeliveryCursor(event map[string]any, cursor string) map[string]any {
	delivery, _ := event["delivery"].(map[string]any)
	updated := make(map[string]any, len(delivery)+1)
	for key, value := range delivery {
		updated[key] = value
	}
	updated["cursor"] = cursor
	event["delivery"] = updated
	return event
}

func cursorSequence(cursor string) int {
	if cursor == "" {
		return 0
	}
	parts := strings.Split(cursor, ":")
	if len(parts) < 2 {
		return 0
	}
	sequence, _ := strconv.Atoi(parts[len(parts)-1])
	return sequence
}

func (s *InMemoryDeliveryStore) RecordEvent(event map[string]any) (string, error) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	state := s.ensureEventLog()
	eventID, _ := event["id"].(string)
	if cursor, ok := state.eventCursors[eventID]; ok && eventID != "" {
		withDeliveryCursor(event, cursor)
		return cursor, nil
	}
	sequence := len(state.events) + 1
	cursor := state.streamID + ":" + strconv.Itoa(sequence)
	withDeliveryCursor(event, cursor)
	state.events = append(state.events, loggedEvent{sequence: sequence, cursor: cursor, event: cloneEvent(event)})
	if eventID != "" {
		state.eventCursors[eventID] = cursor
	}
	return cursor, nil
}

func (s *InMemoryDeliveryStore) ReplayEvents(afterCursor string, limit int) []map[string]any {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	state := s.ensureEventLog()
	if limit <= 0 {
		limit = 100
	}
	after := cursorSequence(afterCursor)
	result := make([]map[string]any, 0, limit)
	for _, item := range state.events {
		if item.sequence <= after {
			continue
		}
		event := cloneEvent(item.event)
		withDeliveryCursor(event, item.cursor)
		result = append(result, event)
		if len(result) >= limit {
			break
		}
	}
	return result
}

func (s *InMemoryDeliveryStore) AckConsumer(consumerID, eventID, cursor string) error {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	state := s.ensureEventLog()
	if cursor == "" && eventID != "" {
		cursor = state.eventCursors[eventID]
	}
	if cursor != "" {
		if existing := state.consumerCursors[consumerID]; existing == "" || cursorSequence(cursor) > cursorSequence(existing) {
			state.consumerCursors[consumerID] = cursor
		}
	}
	return nil
}

func (s *InMemoryDeliveryStore) ConsumerCursor(consumerID string) (string, bool) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	cursor, ok := s.ensureEventLog().consumerCursors[consumerID]
	return cursor, ok
}

func (s *InMemoryDeliveryStore) LastCursor() string {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	state := s.ensureEventLog()
	if len(state.events) == 0 {
		return ""
	}
	return state.events[len(state.events)-1].cursor
}

func (s *InMemoryDeliveryStore) PruneEvents(throughCursor string) (int, error) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	state := s.ensureEventLog()
	through := cursorSequence(throughCursor)
	if through <= 0 {
		return 0, nil
	}
	kept := state.events[:0]
	removed := 0
	for _, item := range state.events {
		if item.sequence <= through {
			if eventID, ok := item.event["id"].(string); ok {
				delete(state.eventCursors, eventID)
			}
			removed++
			continue
		}
		kept = append(kept, item)
	}
	state.events = kept
	return removed, nil
}

func (s *InMemoryDeliveryStore) ensureEventLog() *eventLogState {
	if s.eventLog == nil {
		s.eventLog = newEventLogState(s.streamID)
	}
	return s.eventLog
}
