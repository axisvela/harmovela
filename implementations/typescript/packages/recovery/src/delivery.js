import { InMemoryDeliveryStore } from "./delivery-store-memory.js";
import { DeliveryJournal } from "./delivery-journal.js";

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
    this._store = options.store ?? new InMemoryDeliveryStore({ startSequence: options.startSequence, streamId: options.streamId });
    this._journal = options.journal ?? new DeliveryJournal({ streamId: options.streamId });
  }

  nextSequence() {
    return this._store.nextSequence();
  }

  get cursor() {
    const streamId = this._store._streamId ?? "stream_01";
    const seq = this._store._sequence ?? 0;
    return `${streamId}:${seq}`;
  }

  get lastAcknowledgedCursor() {
    const stats = this._store.getStats();
    return stats.lastAckCursor ?? `${this._store._streamId ?? "stream_01"}:0`;
  }

  track(eventId, subscriptionId = "_default") {
    const seq = this._store.track(eventId, subscriptionId);
    this._journal.append({ type: "delivery.tracked", eventId, subscriptionId, sequence: seq });
    return seq;
  }

  ack(eventId) {
    return this._store.ack(eventId);
  }

  nack(eventId) {
    return this._store.nack(eventId);
  }

  getPending() {
    return this._store.getPending();
  }

  getPendingForSubscription(subscriptionId) {
    return this._store.getPendingForSubscription(subscriptionId);
  }

  isAcknowledged(eventId) {
    return this._store.isAcknowledged(eventId);
  }

  isPending(eventId) {
    return this._store.isPending(eventId);
  }

  hasAttemptsRemaining(eventId, maxAttempts = DEFAULT_RETRY.max_attempts) {
    return this._store.hasAttemptsRemaining(eventId, maxAttempts);
  }

  deadLetter(eventId, reason = {}) {
    return this._store.deadLetter(eventId, reason);
  }

  get deadLettered() {
    return new Map(this._store._deadLettered ?? new Map());
  }

  get stats() {
    return this._store.getStats();
  }
}
