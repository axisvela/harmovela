import pg from "pg";

const { Client } = pg;

export class PostgresDeliveryStore {
  constructor(url, options = {}) {
    this._client = new Client({ connectionString: url });
    this._streamId = options.streamId ?? "stream_01";
    this._prefix = options.tablePrefix ?? "delivery";
    this._dropOnClose = options.dropOnClose ?? false;
    this._sequence = 0;
    this._lastAckCursor = null;
    this._connected = false;
  }

  _t(name) {
    return `${this._prefix}_${name}`;
  }

  async init() {
    if (this._connected) return;
    await this._client.connect();
    this._connected = true;
    await this._client.query(`
      CREATE TABLE IF NOT EXISTS ${this._t("meta")} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${this._t("pending")} (
        event_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        seq BIGINT NOT NULL,
        cursor TEXT NOT NULL,
        attempts INT NOT NULL DEFAULT 1,
        first_attempt_at TEXT NOT NULL,
        last_attempt_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${this._t("acked")} (
        event_id TEXT PRIMARY KEY,
        cursor TEXT NOT NULL,
        acked_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${this._t("dead_lettered")} (
        event_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        seq BIGINT NOT NULL,
        cursor TEXT NOT NULL,
        attempts INT NOT NULL,
        last_attempt_at TEXT NOT NULL,
        reason JSONB NOT NULL DEFAULT '{}',
        dead_lettered_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${this._t("subscriptions")} (
        id TEXT PRIMARY KEY,
        filter JSONB NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  nextSequence() {
    return ++this._sequence;
  }

  async track(eventId, subscriptionId = "_default") {
    const seq = this.nextSequence();
    const now = new Date().toISOString();
    const cursor = `${this._streamId}:${seq}`;
    await this._client.query(
      `INSERT INTO ${this._t("pending")}
       (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at)
       VALUES ($1,$2,$3,$4,1,$5,$6)
       ON CONFLICT (event_id) DO UPDATE SET
       subscription_id=EXCLUDED.subscription_id, seq=EXCLUDED.seq, cursor=EXCLUDED.cursor,
       attempts=1, first_attempt_at=EXCLUDED.first_attempt_at, last_attempt_at=EXCLUDED.last_attempt_at`,
      [eventId, subscriptionId, seq, cursor, now, now]
    );
    return seq;
  }

  async ack(eventId) {
    const res = await this._client.query(
      `SELECT cursor FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    if (res.rowCount === 0) return false;
    const cursor = res.rows[0].cursor;
    await this._client.query(`DELETE FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    await this._client.query(
      `INSERT INTO ${this._t("acked")} (event_id, cursor, acked_at) VALUES ($1,$2,$3)
       ON CONFLICT (event_id) DO UPDATE SET cursor=EXCLUDED.cursor, acked_at=EXCLUDED.acked_at`,
      [eventId, cursor, new Date().toISOString()]
    );
    await this._client.query(
      `INSERT INTO ${this._t("meta")} (key, value) VALUES ('last_ack_cursor', $1)
       ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
      [cursor]
    );
    this._lastAckCursor = cursor;
    return true;
  }

  async nack(eventId) {
    const res = await this._client.query(
      `SELECT attempts FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    if (res.rowCount === 0) return false;
    const attempts = res.rows[0].attempts + 1;
    await this._client.query(
      `UPDATE ${this._t("pending")} SET attempts = $1, last_attempt_at = $2 WHERE event_id = $3`,
      [attempts, new Date().toISOString(), eventId]
    );
    return attempts;
  }

  async deadLetter(eventId, reason = {}) {
    const res = await this._client.query(
      `SELECT subscription_id, seq, cursor, attempts, last_attempt_at
       FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    await this._client.query(`DELETE FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    await this._client.query(
      `INSERT INTO ${this._t("dead_lettered")}
       (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, row.subscription_id, row.seq, row.cursor, row.attempts, row.last_attempt_at,
       JSON.stringify(reason), new Date().toISOString()]
    );
    return {
      type: "event.dead_lettered",
      payload: {
        original_event_id: eventId,
        subscription_id: row.subscription_id,
        cursor: row.cursor,
        attempts: row.attempts,
        last_attempt_at: row.last_attempt_at,
        error: reason.error ?? null
      }
    };
  }

  async getPending() {
    const res = await this._client.query(
      `SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at
       FROM ${this._t("pending")} ORDER BY seq`);
    return res.rows.map(rowToPending);
  }

  async getPendingForSubscription(subscriptionId) {
    const res = await this._client.query(
      `SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at
       FROM ${this._t("pending")} WHERE subscription_id = $1 ORDER BY seq`, [subscriptionId]);
    return res.rows.map(rowToPending);
  }

  async getDeadLettered() {
    const res = await this._client.query(
      `SELECT event_id, subscription_id, seq, cursor, attempts, last_attempt_at, dead_lettered_at, reason
       FROM ${this._t("dead_lettered")} ORDER BY seq`);
    return res.rows.map(rowToDeadLettered);
  }

  async isAcknowledged(eventId) {
    const res = await this._client.query(
      `SELECT 1 FROM ${this._t("acked")} WHERE event_id = $1`, [eventId]);
    return res.rowCount > 0;
  }

  async isPending(eventId) {
    const res = await this._client.query(
      `SELECT 1 FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    return res.rowCount > 0;
  }

  async hasAttemptsRemaining(eventId, maxAttempts) {
    const res = await this._client.query(
      `SELECT attempts FROM ${this._t("pending")} WHERE event_id = $1`, [eventId]);
    if (res.rowCount === 0) return false;
    return res.rows[0].attempts < maxAttempts;
  }

  async getStats() {
    const pending = await this._count("pending");
    const acked = await this._count("acked");
    const dlq = await this._count("dead_lettered");
    const meta = await this._client.query(
      `SELECT value FROM ${this._t("meta")} WHERE key = 'last_ack_cursor'`);
    return {
      totalSequences: this._sequence,
      pending,
      acknowledged: acked,
      deadLettered: dlq,
      lastAckCursor: meta.rowCount > 0 ? meta.rows[0].value : null
    };
  }

  async _count(name) {
    const res = await this._client.query(`SELECT COUNT(*)::int AS c FROM ${this._t(name)}`);
    return res.rows[0].c;
  }

  async createSubscription(record) {
    await this._client.query(
      `INSERT INTO ${this._t("subscriptions")} (id, filter, created_at) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET filter=EXCLUDED.filter, created_at=EXCLUDED.created_at`,
      [record.id, JSON.stringify(record.filter ?? {}), record.created_at]
    );
    return record;
  }

  async getSubscription(id) {
    const res = await this._client.query(
      `SELECT id, filter, created_at FROM ${this._t("subscriptions")} WHERE id = $1`, [id]);
    if (res.rowCount === 0) return null;
    return rowToSubscription(res.rows[0]);
  }

  async listSubscriptions() {
    const res = await this._client.query(
      `SELECT id, filter, created_at FROM ${this._t("subscriptions")} ORDER BY created_at`);
    return res.rows.map(rowToSubscription);
  }

  async deleteSubscription(id) {
    const res = await this._client.query(
      `DELETE FROM ${this._t("subscriptions")} WHERE id = $1`, [id]);
    return res.rowCount > 0;
  }

  async close() {
    if (this._dropOnClose) {
      await this._client.query(
        `DROP TABLE IF EXISTS ${this._t("meta")}, ${this._t("pending")}, ` +
        `${this._t("acked")}, ${this._t("dead_lettered")}, ${this._t("subscriptions")}`);
    }
    await this._client.end();
  }
}

function rowToPending(row) {
  return {
    eventId: row.event_id,
    subscriptionId: row.subscription_id,
    sequence: Number(row.seq),
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
    sequence: Number(row.seq),
    cursor: row.cursor,
    attempts: row.attempts,
    lastAttemptAt: row.last_attempt_at,
    deadLetteredAt: row.dead_lettered_at,
    reason: typeof row.reason === "string" ? JSON.parse(row.reason) : row.reason
  };
}

function rowToSubscription(row) {
  return {
    id: row.id,
    filter: typeof row.filter === "string" ? JSON.parse(row.filter) : row.filter,
    created_at: row.created_at
  };
}
