import Database from "better-sqlite3";

export class SqliteDeliveryStore {
  constructor(url, streamId = "stream_01") {
    this._db = new Database(url);
    this._streamId = streamId;
    this._sequence = 0;
    this._db.pragma("journal_mode = WAL");
    this._initSchema();
  }

  _initSchema() {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS delivery_pending (
        event_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        cursor TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 1,
        first_attempt_at TEXT NOT NULL,
        last_attempt_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS delivery_acked (
        event_id TEXT PRIMARY KEY,
        cursor TEXT NOT NULL,
        acked_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS delivery_dead_lettered (
        event_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        cursor TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        last_attempt_at TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '{}',
        dead_lettered_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS delivery_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  nextSequence() {
    return ++this._sequence;
  }

  track(eventId, subscriptionId = "_default") {
    const seq = this.nextSequence();
    const now = new Date().toISOString();
    const cursor = `${this._streamId}:${seq}`;
    this._db.prepare(
      "INSERT INTO delivery_pending (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at) VALUES (?,?,?,?,1,?,?)"
    ).run(eventId, subscriptionId, seq, cursor, now, now);
    return seq;
  }

  ack(eventId) {
    const entry = this._db.prepare("SELECT * FROM delivery_pending WHERE event_id = ?").get(eventId);
    if (!entry) return false;
    this._db.prepare("DELETE FROM delivery_pending WHERE event_id = ?").run(eventId);
    this._db.prepare("INSERT INTO delivery_acked (event_id, cursor, acked_at) VALUES (?,?,?)")
      .run(eventId, entry.cursor, new Date().toISOString());
    this._db.prepare("INSERT OR REPLACE INTO delivery_meta (key, value) VALUES ('last_ack_cursor', ?)")
      .run(entry.cursor);
    return true;
  }

  nack(eventId) {
    const entry = this._db.prepare("SELECT * FROM delivery_pending WHERE event_id = ?").get(eventId);
    if (!entry) return false;
    const attempts = entry.attempts + 1;
    this._db.prepare("UPDATE delivery_pending SET attempts = ?, last_attempt_at = ? WHERE event_id = ?")
      .run(attempts, new Date().toISOString(), eventId);
    return attempts;
  }

  deadLetter(eventId, reason = {}) {
    const entry = this._db.prepare("SELECT * FROM delivery_pending WHERE event_id = ?").get(eventId);
    if (!entry) return null;
    this._db.prepare("DELETE FROM delivery_pending WHERE event_id = ?").run(eventId);
    this._db.prepare(
      "INSERT INTO delivery_dead_lettered (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at) VALUES (?,?,?,?,?,?,?,?)"
    ).run(eventId, entry.subscription_id, entry.seq, entry.cursor, entry.attempts, entry.last_attempt_at,
      JSON.stringify(reason), new Date().toISOString());
    return {
      type: "event.dead_lettered",
      payload: {
        original_event_id: eventId,
        subscription_id: entry.subscription_id,
        cursor: entry.cursor,
        attempts: entry.attempts,
        last_attempt_at: entry.last_attempt_at,
        error: reason.error ?? null
      }
    };
  }

  getPending() {
    return this._db.prepare("SELECT * FROM delivery_pending ORDER BY seq").all().map(rowToPending);
  }

  getPendingForSubscription(subscriptionId) {
    return this._db.prepare("SELECT * FROM delivery_pending WHERE subscription_id = ? ORDER BY seq")
      .all(subscriptionId).map(rowToPending);
  }

  getDeadLettered() {
    return this._db.prepare("SELECT * FROM delivery_dead_lettered ORDER BY seq").all().map(rowToDeadLettered);
  }

  isAcknowledged(eventId) {
    return !!this._db.prepare("SELECT 1 FROM delivery_acked WHERE event_id = ?").get(eventId);
  }

  isPending(eventId) {
    return !!this._db.prepare("SELECT 1 FROM delivery_pending WHERE event_id = ?").get(eventId);
  }

  hasAttemptsRemaining(eventId, maxAttempts) {
    const entry = this._db.prepare("SELECT attempts FROM delivery_pending WHERE event_id = ?").get(eventId);
    return entry ? entry.attempts < maxAttempts : false;
  }

  getStats() {
    const pending = this._db.prepare("SELECT COUNT(*) as c FROM delivery_pending").get().c;
    const acked = this._db.prepare("SELECT COUNT(*) as c FROM delivery_acked").get().c;
    const dlq = this._db.prepare("SELECT COUNT(*) as c FROM delivery_dead_lettered").get().c;
    const meta = this._db.prepare("SELECT value FROM delivery_meta WHERE key = 'last_ack_cursor'").get();
    return {
      totalSequences: this._sequence,
      pending,
      acknowledged: acked,
      deadLettered: dlq,
      lastAckCursor: meta?.value ?? null
    };
  }

  close() {
    this._db.close();
  }
}

function rowToPending(row) {
  return {
    eventId: row.event_id,
    subscriptionId: row.subscription_id,
    sequence: row.seq,
    cursor: row.cursor,
    attempts: row.attempts,
    firstAttemptAt: row.first_attempt_at,
    lastAttemptAt: row.last_attempt_at
  };
}

function rowToDeadLettered(row) {
  return {
    eventId: row.event_id,
    subscriptionId: row.subscription_id,
    sequence: row.seq,
    cursor: row.cursor,
    attempts: row.attempts,
    lastAttemptAt: row.last_attempt_at,
    deadLetteredAt: row.dead_lettered_at,
    reason: JSON.parse(row.reason)
  };
}
