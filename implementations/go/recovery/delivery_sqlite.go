package recovery

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

type SqliteDeliveryStore struct {
	db          *sql.DB
	sequence    int
	streamID    string
	lastAckCursor string
}

func NewSqliteDeliveryStore(dsn string, streamID string) (*SqliteDeliveryStore, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("sqlite open: %w", err)
	}

	if streamID == "" {
		streamID = "stream_01"
	}

	store := &SqliteDeliveryStore{
		db:       db,
		streamID: streamID,
	}

	if err := store.migrate(); err != nil {
		db.Close()
		return nil, fmt.Errorf("sqlite migrate: %w", err)
	}

	return store, nil
}

func (s *SqliteDeliveryStore) Close() error {
	return s.db.Close()
}

func (s *SqliteDeliveryStore) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS delivery_meta (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS delivery_pending (
		event_id TEXT PRIMARY KEY,
		subscription_id TEXT NOT NULL,
		sequence INTEGER NOT NULL,
		cursor TEXT NOT NULL,
		attempts INTEGER NOT NULL DEFAULT 1,
		first_attempt_at TEXT NOT NULL,
		last_attempt_at TEXT NOT NULL,
		next_retry_at TEXT
	);

	CREATE TABLE IF NOT EXISTS delivery_acked (
		event_id TEXT PRIMARY KEY,
		cursor TEXT NOT NULL,
		acked_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS delivery_dead_lettered (
		event_id TEXT PRIMARY KEY,
		subscription_id TEXT NOT NULL,
		sequence INTEGER NOT NULL,
		cursor TEXT NOT NULL,
		attempts INTEGER NOT NULL,
		first_attempt_at TEXT NOT NULL,
		last_attempt_at TEXT NOT NULL,
		next_retry_at TEXT,
		dead_lettered_at TEXT NOT NULL,
		reason TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS delivery_subscriptions (
		id TEXT PRIMARY KEY,
		filter TEXT NOT NULL,
		created_at TEXT NOT NULL
	);
	`
	_, err := s.db.Exec(schema)
	return err
}

func (s *SqliteDeliveryStore) NextSequence() int {
	s.sequence++
	return s.sequence
}

func (s *SqliteDeliveryStore) Track(eventID, subscriptionID string) int {
	seq := s.NextSequence()
	cursor := fmt.Sprintf("%s:%d", s.streamID, seq)
	nowTS := now()

	s.db.Exec(
		`INSERT OR REPLACE INTO delivery_pending (event_id, subscription_id, sequence, cursor, attempts, first_attempt_at, last_attempt_at) VALUES (?, ?, ?, ?, 1, ?, ?)`,
		eventID, subscriptionID, seq, cursor, nowTS, nowTS,
	)
	return seq
}

func (s *SqliteDeliveryStore) Ack(eventID string) bool {
	row := s.db.QueryRow(`SELECT cursor FROM delivery_pending WHERE event_id = ?`, eventID)
	var cursor string
	if err := row.Scan(&cursor); err != nil {
		return false
	}

	s.db.Exec(`DELETE FROM delivery_pending WHERE event_id = ?`, eventID)
	s.db.Exec(
		`INSERT OR REPLACE INTO delivery_acked (event_id, cursor, acked_at) VALUES (?, ?, ?)`,
		eventID, cursor, now(),
	)
	s.lastAckCursor = cursor
	return true
}

func (s *SqliteDeliveryStore) Nack(eventID string) (int, bool) {
	row := s.db.QueryRow(`SELECT attempts FROM delivery_pending WHERE event_id = ?`, eventID)
	var attempts int
	if err := row.Scan(&attempts); err != nil {
		return 0, false
	}

	attempts++
	nowTS := now()
	s.db.Exec(
		`UPDATE delivery_pending SET attempts = ?, last_attempt_at = ? WHERE event_id = ?`,
		attempts, nowTS, eventID,
	)
	return attempts, true
}

func (s *SqliteDeliveryStore) DeadLetter(eventID string, reason map[string]any) map[string]any {
	row := s.db.QueryRow(
		`SELECT subscription_id, sequence, cursor, attempts, first_attempt_at, last_attempt_at, next_retry_at FROM delivery_pending WHERE event_id = ?`,
		eventID,
	)
	var subscriptionID string
	var sequence int
	var cursor string
	var attempts int
	var firstAttemptAt string
	var lastAttemptAt string
	var nextRetryAt sql.NullString

	if err := row.Scan(&subscriptionID, &sequence, &cursor, &attempts, &firstAttemptAt, &lastAttemptAt, &nextRetryAt); err != nil {
		return nil
	}

	reasonJSON, _ := json.Marshal(reason)
	s.db.Exec(`DELETE FROM delivery_pending WHERE event_id = ?`, eventID)
	nowTS := now()

	nra := sql.NullString{}
	if nextRetryAt.Valid {
		nra = nextRetryAt
	}

	s.db.Exec(
		`INSERT OR REPLACE INTO delivery_dead_lettered (event_id, subscription_id, sequence, cursor, attempts, first_attempt_at, last_attempt_at, next_retry_at, dead_lettered_at, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		eventID, subscriptionID, sequence, cursor, attempts, firstAttemptAt, lastAttemptAt, nra, nowTS, string(reasonJSON),
	)

	var errorVal any
	if reason != nil {
		if errVal, ok := reason["error"]; ok {
			errorVal = errVal
		}
	}

	return map[string]any{
		"type": "event.dead_lettered",
		"payload": map[string]any{
			"original_event_id": eventID,
			"subscription_id":   subscriptionID,
			"cursor":            cursor,
			"attempts":          attempts,
			"last_attempt_at":   lastAttemptAt,
			"error":             errorVal,
		},
	}
}

func (s *SqliteDeliveryStore) GetPending() []map[string]any {
	rows, err := s.db.Query(`SELECT event_id, subscription_id, sequence, cursor, attempts, first_attempt_at, last_attempt_at, next_retry_at FROM delivery_pending`)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		var eventID, subscriptionID, cursor, firstAttemptAt, lastAttemptAt string
		var sequence, attempts int
		var nextRetryAt sql.NullString

		if err := rows.Scan(&eventID, &subscriptionID, &sequence, &cursor, &attempts, &firstAttemptAt, &lastAttemptAt, &nextRetryAt); err != nil {
			continue
		}

		entry := map[string]any{
			"eventId":        eventID,
			"subscriptionId": subscriptionID,
			"sequence":       sequence,
			"cursor":         cursor,
			"attempts":       attempts,
			"firstAttemptAt": firstAttemptAt,
			"lastAttemptAt":  lastAttemptAt,
		}
		if nextRetryAt.Valid {
			entry["nextRetryAt"] = nextRetryAt.String
		} else {
			entry["nextRetryAt"] = nil
		}
		result = append(result, entry)
	}
	return result
}

func (s *SqliteDeliveryStore) GetPendingForSubscription(subscriptionID string) []map[string]any {
	rows, err := s.db.Query(`SELECT event_id, subscription_id, sequence, cursor, attempts, first_attempt_at, last_attempt_at, next_retry_at FROM delivery_pending WHERE subscription_id = ?`, subscriptionID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		var eventID, subscriptionID, cursor, firstAttemptAt, lastAttemptAt string
		var sequence, attempts int
		var nextRetryAt sql.NullString

		if err := rows.Scan(&eventID, &subscriptionID, &sequence, &cursor, &attempts, &firstAttemptAt, &lastAttemptAt, &nextRetryAt); err != nil {
			continue
		}

		entry := map[string]any{
			"eventId":        eventID,
			"subscriptionId": subscriptionID,
			"sequence":       sequence,
			"cursor":         cursor,
			"attempts":       attempts,
			"firstAttemptAt": firstAttemptAt,
			"lastAttemptAt":  lastAttemptAt,
		}
		if nextRetryAt.Valid {
			entry["nextRetryAt"] = nextRetryAt.String
		} else {
			entry["nextRetryAt"] = nil
		}
		result = append(result, entry)
	}
	return result
}

func (s *SqliteDeliveryStore) GetDeadLettered() []map[string]any {
	rows, err := s.db.Query(`SELECT event_id, subscription_id, reason FROM delivery_dead_lettered ORDER BY sequence`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	result := make([]map[string]any, 0)
	for rows.Next() {
		var eventID, subscriptionID, reasonStr string
		if err := rows.Scan(&eventID, &subscriptionID, &reasonStr); err != nil {
			continue
		}
		var reason map[string]any
		json.Unmarshal([]byte(reasonStr), &reason)
		result = append(result, map[string]any{
			"eventId":        eventID,
			"subscriptionId": subscriptionID,
			"reason":         reason,
		})
	}
	return result
}

func (s *SqliteDeliveryStore) IsAcknowledged(eventID string) bool {
	row := s.db.QueryRow(`SELECT 1 FROM delivery_acked WHERE event_id = ?`, eventID)
	var val int
	return row.Scan(&val) == nil
}

func (s *SqliteDeliveryStore) IsPending(eventID string) bool {
	row := s.db.QueryRow(`SELECT 1 FROM delivery_pending WHERE event_id = ?`, eventID)
	var val int
	return row.Scan(&val) == nil
}

func (s *SqliteDeliveryStore) HasAttemptsRemaining(eventID string, maxAttempts int) bool {
	row := s.db.QueryRow(`SELECT attempts FROM delivery_pending WHERE event_id = ?`, eventID)
	var attempts int
	if err := row.Scan(&attempts); err != nil {
		return false
	}
	return attempts < maxAttempts
}

func (s *SqliteDeliveryStore) GetStats() map[string]any {
	var pending, acknowledged, deadLettered int

	s.db.QueryRow(`SELECT COUNT(*) FROM delivery_pending`).Scan(&pending)
	s.db.QueryRow(`SELECT COUNT(*) FROM delivery_acked`).Scan(&acknowledged)
	s.db.QueryRow(`SELECT COUNT(*) FROM delivery_dead_lettered`).Scan(&deadLettered)

	lastAck := any(nil)
	if s.lastAckCursor != "" {
		lastAck = s.lastAckCursor
	}

	return map[string]any{
		"totalSequences": s.sequence,
		"pending":        pending,
		"acknowledged":   acknowledged,
		"deadLettered":   deadLettered,
		"lastAckCursor":  lastAck,
	}
}

func init() {
	_ = time.Now
}

func (s *SqliteDeliveryStore) CreateSubscription(record map[string]any) map[string]any {
	id, _ := record["id"].(string)
	createdAt, _ := record["created_at"].(string)
	filterJSON, _ := json.Marshal(record["filter"])
	s.db.Exec(`INSERT OR REPLACE INTO delivery_subscriptions (id, filter, created_at) VALUES (?, ?, ?)`,
		id, string(filterJSON), createdAt)
	return record
}

func (s *SqliteDeliveryStore) GetSubscription(id string) map[string]any {
	row := s.db.QueryRow(`SELECT id, filter, created_at FROM delivery_subscriptions WHERE id = ?`, id)
	return scanSubscription(row.Scan)
}

func (s *SqliteDeliveryStore) ListSubscriptions() []map[string]any {
	rows, err := s.db.Query(`SELECT id, filter, created_at FROM delivery_subscriptions ORDER BY created_at`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	result := make([]map[string]any, 0)
	for rows.Next() {
		if sub := scanSubscription(rows.Scan); sub != nil {
			result = append(result, sub)
		}
	}
	return result
}

func (s *SqliteDeliveryStore) DeleteSubscription(id string) bool {
	res, err := s.db.Exec(`DELETE FROM delivery_subscriptions WHERE id = ?`, id)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func scanSubscription(scan func(dest ...any) error) map[string]any {
	var id, filterStr, createdAt string
	if err := scan(&id, &filterStr, &createdAt); err != nil {
		return nil
	}
	var filter map[string]any
	json.Unmarshal([]byte(filterStr), &filter)
	return map[string]any{"id": id, "filter": filter, "created_at": createdAt}
}
