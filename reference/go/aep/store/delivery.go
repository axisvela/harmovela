package store

import "math"

var DEFAULT_RETRY = map[string]int{
	"max_attempts":       3,
	"backoff_ms":         1000,
	"backoff_multiplier": 2,
	"max_backoff_ms":     30000,
	"ack_timeout_ms":     30000,
}

func RetryDelay(attempt int, policy map[string]int) int {
	if policy == nil {
		policy = DEFAULT_RETRY
	}
	delay := policy["backoff_ms"] * int(math.Pow(float64(policy["backoff_multiplier"]), float64(attempt-1)))
	if delay > policy["max_backoff_ms"] {
		return policy["max_backoff_ms"]
	}
	return delay
}

type DeliveryTracker struct {
	store   DeliveryStore
	journal *DeliveryJournal
}

func NewDeliveryTracker(store DeliveryStore, journal *DeliveryJournal) *DeliveryTracker {
	if store == nil {
		store = NewInMemoryDeliveryStore(0, "stream_01")
	}
	if journal == nil {
		journal = NewDeliveryJournal("stream_01")
	}
	return &DeliveryTracker{
		store:   store,
		journal: journal,
	}
}

func (t *DeliveryTracker) NextSequence() int {
	return t.store.NextSequence()
}

func (t *DeliveryTracker) Track(eventID, subscriptionID string) int {
	seq := t.store.Track(eventID, subscriptionID)
	t.journal.Append(map[string]any{
		"type":           "delivery.tracked",
		"eventId":        eventID,
		"subscriptionId": subscriptionID,
		"sequence":       seq,
	})
	return seq
}

func (t *DeliveryTracker) Ack(eventID string) bool {
	return t.store.Ack(eventID)
}

func (t *DeliveryTracker) Nack(eventID string) (int, bool) {
	return t.store.Nack(eventID)
}

func (t *DeliveryTracker) DeadLetter(eventID string, reason map[string]any) map[string]any {
	return t.store.DeadLetter(eventID, reason)
}

func (t *DeliveryTracker) GetPending() []map[string]any {
	return t.store.GetPending()
}

func (t *DeliveryTracker) GetPendingForSubscription(subscriptionID string) []map[string]any {
	return t.store.GetPendingForSubscription(subscriptionID)
}

func (t *DeliveryTracker) IsAcknowledged(eventID string) bool {
	return t.store.IsAcknowledged(eventID)
}

func (t *DeliveryTracker) IsPending(eventID string) bool {
	return t.store.IsPending(eventID)
}

func (t *DeliveryTracker) HasAttemptsRemaining(eventID string, maxAttempts int) bool {
	return t.store.HasAttemptsRemaining(eventID, maxAttempts)
}

func (t *DeliveryTracker) GetStats() map[string]any {
	return t.store.GetStats()
}
