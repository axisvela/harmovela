package aep

import (
	"database/sql"
	"encoding/json"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type PostgresOptions struct {
	TablePrefix string
	DropOnClose bool
}

type PostgresDeliveryStore struct {
	db            *sql.DB
	sequence      int
	streamID      string
	prefix        string
	dropOnClose   bool
	lastAckCursor string
}

func NewPostgresDeliveryStore(url, streamID string, opts PostgresOptions) (*PostgresDeliveryStore, error) {
	if streamID == "" {
		streamID = "stream_01"
	}
	prefix := opts.TablePrefix
	if prefix == "" {
		prefix = "delivery"
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		return nil, fmt.Errorf("pgx open: %w", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("pgx ping: %w", err)
	}
	s := &PostgresDeliveryStore{
		db:          db,
		streamID:    streamID,
		prefix:      prefix,
		dropOnClose: opts.DropOnClose,
	}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, fmt.Errorf("pg migrate: %w", err)
	}
	return s, nil
}

func (s *PostgresDeliveryStore) t(name string) string {
	return s.prefix + "_" + name
}

func (s *PostgresDeliveryStore) migrate() error {
	schema := fmt.Sprintf(`
	CREATE TABLE IF NOT EXISTS %s (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS %s (
		event_id TEXT PRIMARY KEY,
		subscription_id TEXT NOT NULL,
		seq BIGINT NOT NULL,
		cursor TEXT NOT NULL,
		attempts INT NOT NULL DEFAULT 1,
		first_attempt_at TEXT NOT NULL,
		last_attempt_at TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS %s (
		event_id TEXT PRIMARY KEY,
		cursor TEXT NOT NULL,
		acked_at TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS %s (
		event_id TEXT PRIMARY KEY,
		subscription_id TEXT NOT NULL,
		seq BIGINT NOT NULL,
		cursor TEXT NOT NULL,
		attempts INT NOT NULL,
		last_attempt_at TEXT NOT NULL,
		reason JSONB NOT NULL DEFAULT '{}',
		dead_lettered_at TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS %s (
		id TEXT PRIMARY KEY,
		filter JSONB NOT NULL,
		created_at TEXT NOT NULL
	);`,
		s.t("meta"), s.t("pending"), s.t("acked"), s.t("dead_lettered"), s.t("subscriptions"))
	_, err := s.db.Exec(schema)
	return err
}

func (s *PostgresDeliveryStore) Close() error {
	if s.dropOnClose {
		s.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s, %s, %s, %s, %s",
			s.t("meta"), s.t("pending"), s.t("acked"), s.t("dead_lettered"), s.t("subscriptions")))
	}
	return s.db.Close()
}

func (s *PostgresDeliveryStore) NextSequence() int {
	s.sequence++
	return s.sequence
}

func (s *PostgresDeliveryStore) Track(eventID, subscriptionID string) int {
	seq := s.NextSequence()
	cursor := fmt.Sprintf("%s:%d", s.streamID, seq)
	nowTS := now()
	s.db.Exec(fmt.Sprintf(
		`INSERT INTO %s (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at)
		 VALUES ($1,$2,$3,$4,1,$5,$6)
		 ON CONFLICT (event_id) DO UPDATE SET subscription_id=EXCLUDED.subscription_id, seq=EXCLUDED.seq,
		 cursor=EXCLUDED.cursor, attempts=1, first_attempt_at=EXCLUDED.first_attempt_at, last_attempt_at=EXCLUDED.last_attempt_at`,
		s.t("pending")), eventID, subscriptionID, seq, cursor, nowTS, nowTS)
	return seq
}

func (s *PostgresDeliveryStore) Ack(eventID string) bool {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT cursor FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	var cursor string
	if err := row.Scan(&cursor); err != nil {
		return false
	}
	s.db.Exec(fmt.Sprintf(`DELETE FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	s.db.Exec(fmt.Sprintf(
		`INSERT INTO %s (event_id, cursor, acked_at) VALUES ($1,$2,$3)
		 ON CONFLICT (event_id) DO UPDATE SET cursor=EXCLUDED.cursor, acked_at=EXCLUDED.acked_at`,
		s.t("acked")), eventID, cursor, now())
	s.lastAckCursor = cursor
	return true
}

func (s *PostgresDeliveryStore) Nack(eventID string) (int, bool) {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT attempts FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	var attempts int
	if err := row.Scan(&attempts); err != nil {
		return 0, false
	}
	attempts++
	s.db.Exec(fmt.Sprintf(`UPDATE %s SET attempts = $1, last_attempt_at = $2 WHERE event_id = $3`,
		s.t("pending")), attempts, now(), eventID)
	return attempts, true
}

func (s *PostgresDeliveryStore) DeadLetter(eventID string, reason map[string]any) map[string]any {
	row := s.db.QueryRow(fmt.Sprintf(
		`SELECT subscription_id, seq, cursor, attempts, last_attempt_at FROM %s WHERE event_id = $1`,
		s.t("pending")), eventID)
	var subscriptionID, cursor, lastAttemptAt string
	var seq, attempts int
	if err := row.Scan(&subscriptionID, &seq, &cursor, &attempts, &lastAttemptAt); err != nil {
		return nil
	}
	if reason == nil {
		reason = map[string]any{}
	}
	reasonJSON, _ := json.Marshal(reason)
	s.db.Exec(fmt.Sprintf(`DELETE FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	s.db.Exec(fmt.Sprintf(
		`INSERT INTO %s (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 ON CONFLICT (event_id) DO NOTHING`,
		s.t("dead_lettered")), eventID, subscriptionID, seq, cursor, attempts, lastAttemptAt, string(reasonJSON), now())

	var errorVal any
	if errVal, ok := reason["error"]; ok {
		errorVal = errVal
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

func (s *PostgresDeliveryStore) scanPending(query string, args ...any) []map[string]any {
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var result []map[string]any
	for rows.Next() {
		var eventID, subscriptionID, cursor, firstAttemptAt, lastAttemptAt string
		var seq, attempts int
		if err := rows.Scan(&eventID, &subscriptionID, &seq, &cursor, &attempts, &firstAttemptAt, &lastAttemptAt); err != nil {
			continue
		}
		result = append(result, map[string]any{
			"eventId":        eventID,
			"subscriptionId": subscriptionID,
			"sequence":       seq,
			"cursor":         cursor,
			"attempts":       attempts,
			"firstAttemptAt": firstAttemptAt,
			"lastAttemptAt":  lastAttemptAt,
		})
	}
	return result
}

func (s *PostgresDeliveryStore) GetPending() []map[string]any {
	return s.scanPending(fmt.Sprintf(
		`SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at FROM %s ORDER BY seq`,
		s.t("pending")))
}

func (s *PostgresDeliveryStore) GetPendingForSubscription(subscriptionID string) []map[string]any {
	return s.scanPending(fmt.Sprintf(
		`SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at FROM %s WHERE subscription_id = $1 ORDER BY seq`,
		s.t("pending")), subscriptionID)
}

func (s *PostgresDeliveryStore) GetDeadLettered() []map[string]any {
	rows, err := s.db.Query(fmt.Sprintf(`SELECT event_id, subscription_id, reason FROM %s ORDER BY seq`, s.t("dead_lettered")))
	if err != nil {
		return nil
	}
	defer rows.Close()
	result := make([]map[string]any, 0)
	for rows.Next() {
		var eventID, subscriptionID string
		var reasonBytes []byte
		if err := rows.Scan(&eventID, &subscriptionID, &reasonBytes); err != nil {
			continue
		}
		var reason map[string]any
		json.Unmarshal(reasonBytes, &reason)
		result = append(result, map[string]any{
			"eventId":        eventID,
			"subscriptionId": subscriptionID,
			"reason":         reason,
		})
	}
	return result
}

func (s *PostgresDeliveryStore) IsAcknowledged(eventID string) bool {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT 1 FROM %s WHERE event_id = $1`, s.t("acked")), eventID)
	var val int
	return row.Scan(&val) == nil
}

func (s *PostgresDeliveryStore) IsPending(eventID string) bool {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT 1 FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	var val int
	return row.Scan(&val) == nil
}

func (s *PostgresDeliveryStore) HasAttemptsRemaining(eventID string, maxAttempts int) bool {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT attempts FROM %s WHERE event_id = $1`, s.t("pending")), eventID)
	var attempts int
	if err := row.Scan(&attempts); err != nil {
		return false
	}
	return attempts < maxAttempts
}

func (s *PostgresDeliveryStore) GetStats() map[string]any {
	var pending, acknowledged, deadLettered int
	s.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, s.t("pending"))).Scan(&pending)
	s.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, s.t("acked"))).Scan(&acknowledged)
	s.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM %s`, s.t("dead_lettered"))).Scan(&deadLettered)
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

func (s *PostgresDeliveryStore) CreateSubscription(record map[string]any) map[string]any {
	id, _ := record["id"].(string)
	createdAt, _ := record["created_at"].(string)
	filterJSON, _ := json.Marshal(record["filter"])
	s.db.Exec(fmt.Sprintf(
		`INSERT INTO %s (id, filter, created_at) VALUES ($1,$2,$3)
		 ON CONFLICT (id) DO UPDATE SET filter=EXCLUDED.filter, created_at=EXCLUDED.created_at`,
		s.t("subscriptions")), id, string(filterJSON), createdAt)
	return record
}

func (s *PostgresDeliveryStore) GetSubscription(id string) map[string]any {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT id, filter, created_at FROM %s WHERE id = $1`, s.t("subscriptions")), id)
	return scanPgSubscription(row.Scan)
}

func (s *PostgresDeliveryStore) ListSubscriptions() []map[string]any {
	rows, err := s.db.Query(fmt.Sprintf(`SELECT id, filter, created_at FROM %s ORDER BY created_at`, s.t("subscriptions")))
	if err != nil {
		return nil
	}
	defer rows.Close()
	result := make([]map[string]any, 0)
	for rows.Next() {
		if sub := scanPgSubscription(rows.Scan); sub != nil {
			result = append(result, sub)
		}
	}
	return result
}

func (s *PostgresDeliveryStore) DeleteSubscription(id string) bool {
	res, err := s.db.Exec(fmt.Sprintf(`DELETE FROM %s WHERE id = $1`, s.t("subscriptions")), id)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func scanPgSubscription(scan func(dest ...any) error) map[string]any {
	var id, createdAt string
	var filterBytes []byte
	if err := scan(&id, &filterBytes, &createdAt); err != nil {
		return nil
	}
	var filter map[string]any
	json.Unmarshal(filterBytes, &filter)
	return map[string]any{"id": id, "filter": filter, "created_at": createdAt}
}
