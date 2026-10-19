package recovery

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
)

func (s *PostgresDeliveryStore) RecordEvent(event map[string]any) (string, error) {
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
		fmt.Sprintf(`INSERT INTO %s (event_id, payload, created_at) VALUES ($1, $2, $3)
		 ON CONFLICT (event_id) DO NOTHING`, s.t("events")),
		eventID, string(payload), now(),
	); err != nil {
		return "", err
	}
	var sequence int64
	var cursor string
	if err := tx.QueryRow(
		fmt.Sprintf(`SELECT sequence, cursor FROM %s WHERE event_id = $1`, s.t("events")), eventID,
	).Scan(&sequence, &cursor); err != nil {
		return "", err
	}
	if cursor == "" {
		cursor = fmt.Sprintf("%s:%d", s.streamID, sequence)
		if _, err := tx.Exec(
			fmt.Sprintf(`UPDATE %s SET cursor = $1 WHERE sequence = $2`, s.t("events")), cursor, sequence,
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

func (s *PostgresDeliveryStore) ReplayEvents(afterCursor string, limit int) []map[string]any {
	if limit <= 0 {
		limit = 1000
	}
	rows, err := s.db.Query(
		fmt.Sprintf(`SELECT cursor, payload FROM %s WHERE sequence > $1 ORDER BY sequence LIMIT $2`, s.t("events")),
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

func (s *PostgresDeliveryStore) AckConsumer(consumerID, eventID, cursor string) error {
	if cursor == "" && eventID != "" {
		_ = s.db.QueryRow(
			fmt.Sprintf(`SELECT cursor FROM %s WHERE event_id = $1`, s.t("events")), eventID,
		).Scan(&cursor)
	}
	if cursor == "" {
		return nil
	}
	var existing string
	err := s.db.QueryRow(
		fmt.Sprintf(`SELECT cursor FROM %s WHERE consumer_id = $1`, s.t("consumer_offsets")), consumerID,
	).Scan(&existing)
	if err == nil && cursorSequence(cursor) <= cursorSequence(existing) {
		return nil
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	_, err = s.db.Exec(
		fmt.Sprintf(`INSERT INTO %s (consumer_id, cursor, updated_at) VALUES ($1, $2, $3)
		 ON CONFLICT (consumer_id) DO UPDATE SET cursor = EXCLUDED.cursor, updated_at = EXCLUDED.updated_at`, s.t("consumer_offsets")),
		consumerID, cursor, now(),
	)
	return err
}

func (s *PostgresDeliveryStore) ConsumerCursor(consumerID string) (string, bool) {
	var cursor string
	err := s.db.QueryRow(
		fmt.Sprintf(`SELECT cursor FROM %s WHERE consumer_id = $1`, s.t("consumer_offsets")), consumerID,
	).Scan(&cursor)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false
	}
	return cursor, err == nil
}

func (s *PostgresDeliveryStore) PruneEvents(throughCursor string) (int, error) {
	through := cursorSequence(throughCursor)
	if through <= 0 {
		return 0, nil
	}
	result, err := s.db.Exec(
		fmt.Sprintf(`DELETE FROM %s WHERE sequence <= $1`, s.t("events")), through,
	)
	if err != nil {
		return 0, err
	}
	removed, _ := result.RowsAffected()
	return int(removed), nil
}

func (s *PostgresDeliveryStore) LastCursor() string {
	var cursor string
	err := s.db.QueryRow(
		fmt.Sprintf(`SELECT cursor FROM %s ORDER BY sequence DESC LIMIT 1`, s.t("events")),
	).Scan(&cursor)
	if err != nil {
		return ""
	}
	return cursor
}
