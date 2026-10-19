package recovery

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
)

func (s *SqliteDeliveryStore) RecordEvent(event map[string]any) (string, error) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()

	eventID, _ := event["id"].(string)
	if eventID == "" {
		return "", fmt.Errorf("event id is required")
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return "", err
	}
	tx, err := s.db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(
		`INSERT OR IGNORE INTO delivery_events (event_id, payload, created_at) VALUES (?, ?, ?)`,
		eventID, string(payload), now(),
	); err != nil {
		return "", err
	}
	var sequence int64
	var cursor string
	if err := tx.QueryRow(
		`SELECT sequence, cursor FROM delivery_events WHERE event_id = ?`, eventID,
	).Scan(&sequence, &cursor); err != nil {
		return "", err
	}
	if cursor == "" {
		cursor = fmt.Sprintf("%s:%d", s.streamID, sequence)
		if _, err := tx.Exec(
			`UPDATE delivery_events SET cursor = ? WHERE sequence = ?`, cursor, sequence,
		); err != nil {
			return "", err
		}
	}
	if err := tx.Commit(); err != nil {
		return "", err
	}
	withDeliveryCursor(event, cursor)
	return cursor, nil
}

func (s *SqliteDeliveryStore) ReplayEvents(afterCursor string, limit int) []map[string]any {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()

	if limit <= 0 {
		limit = 1000
	}
	rows, err := s.db.Query(
		`SELECT cursor, payload FROM delivery_events WHERE sequence > ? ORDER BY sequence LIMIT ?`,
		cursorSequence(afterCursor), limit,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()
	result := make([]map[string]any, 0)
	for rows.Next() {
		var cursor, payload string
		if err := rows.Scan(&cursor, &payload); err != nil {
			continue
		}
		var event map[string]any
		if err := json.Unmarshal([]byte(payload), &event); err != nil {
			continue
		}
		withDeliveryCursor(event, cursor)
		result = append(result, event)
	}
	return result
}

func (s *SqliteDeliveryStore) AckConsumer(consumerID, eventID, cursor string) error {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()

	if cursor == "" && eventID != "" {
		_ = s.db.QueryRow(`SELECT cursor FROM delivery_events WHERE event_id = ?`, eventID).Scan(&cursor)
	}
	if cursor == "" {
		return nil
	}
	var existing string
	err := s.db.QueryRow(
		`SELECT cursor FROM delivery_consumer_offsets WHERE consumer_id = ?`, consumerID,
	).Scan(&existing)
	if err == nil && cursorSequence(cursor) <= cursorSequence(existing) {
		return nil
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	_, err = s.db.Exec(
		`INSERT INTO delivery_consumer_offsets (consumer_id, cursor, updated_at) VALUES (?, ?, ?)
		 ON CONFLICT (consumer_id) DO UPDATE SET cursor = EXCLUDED.cursor, updated_at = EXCLUDED.updated_at`,
		consumerID, cursor, now(),
	)
	return err
}

func (s *SqliteDeliveryStore) ConsumerCursor(consumerID string) (string, bool) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()

	var cursor string
	err := s.db.QueryRow(`SELECT cursor FROM delivery_consumer_offsets WHERE consumer_id = ?`, consumerID).Scan(&cursor)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false
	}
	return cursor, err == nil
}

func (s *SqliteDeliveryStore) PruneEvents(throughCursor string) (int, error) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()

	through := cursorSequence(throughCursor)
	if through <= 0 {
		return 0, nil
	}
	result, err := s.db.Exec(`DELETE FROM delivery_events WHERE sequence <= ?`, through)
	if err != nil {
		return 0, err
	}
	removed, _ := result.RowsAffected()
	return int(removed), nil
}

func (s *SqliteDeliveryStore) LastCursor() string {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()

	var cursor string
	err := s.db.QueryRow(`SELECT cursor FROM delivery_events ORDER BY sequence DESC LIMIT 1`).Scan(&cursor)
	if err != nil {
		return ""
	}
	return cursor
}
