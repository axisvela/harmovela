package store

import (
	"fmt"
	"time"
)

type DeliveryStore interface {
	Track(eventID, subscriptionID string) int
	Ack(eventID string) bool
	Nack(eventID string) (int, bool)
	DeadLetter(eventID string, reason map[string]any) map[string]any
	GetPending() []map[string]any
	GetPendingForSubscription(subscriptionID string) []map[string]any
	IsAcknowledged(eventID string) bool
	IsPending(eventID string) bool
	HasAttemptsRemaining(eventID string, maxAttempts int) bool
	GetStats() map[string]any
	GetDeadLettered() []map[string]any
	CreateSubscription(record map[string]any) map[string]any
	GetSubscription(id string) map[string]any
	ListSubscriptions() []map[string]any
	DeleteSubscription(id string) bool
	NextSequence() int
}

type InMemoryDeliveryStore struct {
	sequence      int
	streamID      string
	pending       map[string]map[string]any
	acked         map[string]bool
	deadLettered  map[string]map[string]any
	subscriptions map[string]map[string]any
	lastAckCursor string
}

func NewInMemoryDeliveryStore(startSequence int, streamID string) *InMemoryDeliveryStore {
	if streamID == "" {
		streamID = "stream_01"
	}
	return &InMemoryDeliveryStore{
		sequence:      startSequence,
		streamID:      streamID,
		pending:       make(map[string]map[string]any),
		acked:         make(map[string]bool),
		deadLettered:  make(map[string]map[string]any),
		subscriptions: make(map[string]map[string]any),
	}
}

func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func (s *InMemoryDeliveryStore) NextSequence() int {
	s.sequence++
	return s.sequence
}

func (s *InMemoryDeliveryStore) Track(eventID, subscriptionID string) int {
	seq := s.NextSequence()
	s.pending[eventID] = map[string]any{
		"eventId":         eventID,
		"subscriptionId":  subscriptionID,
		"sequence":        seq,
		"cursor":          fmt.Sprintf("%s:%d", s.streamID, seq),
		"attempts":        1,
		"firstAttemptAt":  now(),
		"lastAttemptAt":   now(),
		"nextRetryAt":     nil,
	}
	return seq
}

func (s *InMemoryDeliveryStore) Ack(eventID string) bool {
	entry, ok := s.pending[eventID]
	if !ok {
		return false
	}
	delete(s.pending, eventID)
	s.acked[eventID] = true
	if cursor, ok := entry["cursor"].(string); ok {
		s.lastAckCursor = cursor
	}
	return true
}

func (s *InMemoryDeliveryStore) Nack(eventID string) (int, bool) {
	entry, ok := s.pending[eventID]
	if !ok {
		return 0, false
	}
	attempts := 1
	if v, ok := entry["attempts"].(int); ok {
		attempts = v
	}
	attempts++
	entry["attempts"] = attempts
	entry["lastAttemptAt"] = now()
	return attempts, true
}

func (s *InMemoryDeliveryStore) DeadLetter(eventID string, reason map[string]any) map[string]any {
	entry, ok := s.pending[eventID]
	if !ok {
		return nil
	}
	delete(s.pending, eventID)
	if reason == nil {
		reason = map[string]any{}
	}
	record := map[string]any{
		"eventId":         entry["eventId"],
		"subscriptionId":  entry["subscriptionId"],
		"sequence":        entry["sequence"],
		"cursor":          entry["cursor"],
		"attempts":        entry["attempts"],
		"firstAttemptAt":  entry["firstAttemptAt"],
		"lastAttemptAt":   entry["lastAttemptAt"],
		"nextRetryAt":     entry["nextRetryAt"],
		"deadLetteredAt":  now(),
		"reason":          reason,
	}
	s.deadLettered[eventID] = record

	var errorVal any
	if reasonVal, ok := reason["error"]; ok {
		errorVal = reasonVal
	}

	return map[string]any{
		"type": "event.dead_lettered",
		"payload": map[string]any{
			"original_event_id": eventID,
			"subscription_id":   entry["subscriptionId"],
			"cursor":            entry["cursor"],
			"attempts":          entry["attempts"],
			"last_attempt_at":   entry["lastAttemptAt"],
			"error":             errorVal,
		},
	}
}

func (s *InMemoryDeliveryStore) GetPending() []map[string]any {
	result := make([]map[string]any, 0, len(s.pending))
	for _, v := range s.pending {
		cp := make(map[string]any, len(v))
		for k, val := range v {
			cp[k] = val
		}
		result = append(result, cp)
	}
	return result
}

func (s *InMemoryDeliveryStore) GetPendingForSubscription(subscriptionID string) []map[string]any {
	result := make([]map[string]any, 0)
	for _, v := range s.pending {
		if v["subscriptionId"] == subscriptionID {
			cp := make(map[string]any, len(v))
			for k, val := range v {
				cp[k] = val
			}
			result = append(result, cp)
		}
	}
	return result
}

func (s *InMemoryDeliveryStore) IsAcknowledged(eventID string) bool {
	return s.acked[eventID]
}

func (s *InMemoryDeliveryStore) CreateSubscription(record map[string]any) map[string]any {
	id, _ := record["id"].(string)
	s.subscriptions[id] = record
	return record
}

func (s *InMemoryDeliveryStore) GetSubscription(id string) map[string]any {
	return s.subscriptions[id]
}

func (s *InMemoryDeliveryStore) ListSubscriptions() []map[string]any {
	result := make([]map[string]any, 0, len(s.subscriptions))
	for _, v := range s.subscriptions {
		result = append(result, v)
	}
	return result
}

func (s *InMemoryDeliveryStore) DeleteSubscription(id string) bool {
	if _, ok := s.subscriptions[id]; !ok {
		return false
	}
	delete(s.subscriptions, id)
	return true
}

func (s *InMemoryDeliveryStore) GetDeadLettered() []map[string]any {
	result := make([]map[string]any, 0, len(s.deadLettered))
	for _, v := range s.deadLettered {
		result = append(result, map[string]any{
			"eventId":        v["eventId"],
			"subscriptionId": v["subscriptionId"],
			"reason":         v["reason"],
		})
	}
	return result
}

func (s *InMemoryDeliveryStore) IsPending(eventID string) bool {
	_, ok := s.pending[eventID]
	return ok
}

func (s *InMemoryDeliveryStore) HasAttemptsRemaining(eventID string, maxAttempts int) bool {
	entry, ok := s.pending[eventID]
	if !ok {
		return false
	}
	attempts, ok := entry["attempts"].(int)
	if !ok {
		return false
	}
	return attempts < maxAttempts
}

func (s *InMemoryDeliveryStore) GetStats() map[string]any {
	lastAck := any(nil)
	if s.lastAckCursor != "" {
		lastAck = s.lastAckCursor
	}
	return map[string]any{
		"totalSequences": s.sequence,
		"pending":        len(s.pending),
		"acknowledged":   len(s.acked),
		"deadLettered":   len(s.deadLettered),
		"lastAckCursor":  lastAck,
	}
}
