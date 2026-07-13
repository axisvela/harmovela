export class InMemoryDeliveryStore {
  constructor(options = {}) {
    this._sequence = options.startSequence ?? 0;
    this._streamId = options.streamId ?? "stream_01";
    this._pending = new Map();
    this._acked = new Set();
    this._deadLettered = new Map();
    this._lastAckCursor = null;
    this._subscriptions = new Map();
  }

  nextSequence() {
    return ++this._sequence;
  }

  track(eventId, subscriptionId, _data = {}) {
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
    entry.attempts++;
    entry.lastAttemptAt = new Date().toISOString();
    return entry.attempts;
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

  getPending() {
    return [...this._pending.values()];
  }

  getPendingForSubscription(subscriptionId) {
    return this.getPending().filter((e) => e.subscriptionId === subscriptionId);
  }

  getDeadLettered() {
    return [...this._deadLettered.values()];
  }

  createSubscription(record) {
    this._subscriptions.set(record.id, record);
    return record;
  }

  getSubscription(id) {
    return this._subscriptions.get(id) ?? null;
  }

  listSubscriptions() {
    return [...this._subscriptions.values()];
  }

  deleteSubscription(id) {
    return this._subscriptions.delete(id);
  }

  isAcknowledged(eventId) {
    return this._acked.has(eventId);
  }

  isPending(eventId) {
    return this._pending.has(eventId);
  }

  hasAttemptsRemaining(eventId, maxAttempts) {
    const entry = this._pending.get(eventId);
    if (!entry) return false;
    return entry.attempts < maxAttempts;
  }

  getStats() {
    return {
      totalSequences: this._sequence,
      pending: this._pending.size,
      acknowledged: this._acked.size,
      deadLettered: this._deadLettered.size,
      lastAckCursor: this._lastAckCursor
    };
  }
}
