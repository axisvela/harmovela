const DEFAULT_RETRY = {
  max_attempts: 3,
  backoff_ms: 1000,
  backoff_multiplier: 2,
  max_backoff_ms: 30000,
  ack_timeout_ms: 30000
};

export function retryDelay(attempt, policy = DEFAULT_RETRY) {
  return Math.min(
    policy.backoff_ms * Math.pow(policy.backoff_multiplier, attempt - 1),
    policy.max_backoff_ms
  );
}

export class DeliveryTracker {
  constructor(options = {}) {
    this._sequence = options.startSequence ?? 0;
    this._streamId = options.streamId ?? "stream_01";
    this._pending = new Map();
    this._acked = new Set();
    this._deadLettered = new Map();
    this._lastAckCursor = null;
  }

  nextSequence() {
    return ++this._sequence;
  }

  get cursor() {
    return `${this._streamId}:${this._sequence}`;
  }

  get lastAcknowledgedCursor() {
    return this._lastAckCursor ?? `${this._streamId}:0`;
  }

  track(eventId, subscriptionId = "_default") {
    const seq = this.nextSequence();
    this._pending.set(eventId, {
      eventId,
      subscriptionId,
      sequence: seq,
      cursor: `${this._streamId}:${seq}`,
      attempts: 1,
      firstAttemptAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      nextRetryAt: null
    });
    return seq;
  }

  ack(eventId) {
    const entry = this._pending.get(eventId);
    if (!entry) return false;

    this._pending.delete(eventId);
    this._acked.add(eventId);
    this._lastAckCursor = entry.cursor;
    return true;
  }

  nack(eventId) {
    const entry = this._pending.get(eventId);
    if (!entry) return false;
    return this._retry(entry);
  }

  _retry(entry) {
    entry.attempts++;
    entry.lastAttemptAt = new Date().toISOString();
    return entry.attempts;
  }

  getPending() {
    return [...this._pending.values()];
  }

  getPendingForSubscription(subscriptionId) {
    return this.getPending().filter((e) => e.subscriptionId === subscriptionId);
  }

  isAcknowledged(eventId) {
    return this._acked.has(eventId);
  }

  isPending(eventId) {
    return this._pending.has(eventId);
  }

  hasAttemptsRemaining(eventId, maxAttempts = DEFAULT_RETRY.max_attempts) {
    const entry = this._pending.get(eventId);
    if (!entry) return false;
    return entry.attempts < maxAttempts;
  }

  deadLetter(eventId, reason = {}) {
    const entry = this._pending.get(eventId);
    if (!entry) return null;

    this._pending.delete(eventId);

    const record = {
      ...entry,
      deadLetteredAt: new Date().toISOString(),
      reason
    };
    this._deadLettered.set(eventId, record);

    return {
      type: "event.dead_lettered",
      payload: {
        original_event_id: eventId,
        subscription_id: entry.subscriptionId,
        cursor: entry.cursor,
        attempts: entry.attempts,
        last_attempt_at: entry.lastAttemptAt,
        error: reason.error ?? null
      }
    };
  }

  get deadLettered() {
    return new Map(this._deadLettered);
  }

  get stats() {
    return {
      totalSequences: this._sequence,
      pending: this._pending.size,
      acknowledged: this._acked.size,
      deadLettered: this._deadLettered.size,
      lastAckCursor: this._lastAckCursor
    };
  }
}
