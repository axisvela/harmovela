import assert from "node:assert/strict";
import test from "node:test";
import { DeliveryTracker, retryDelay } from "../src/index.js";
import { InMemoryDeliveryStore } from "../src/delivery-store-memory.js";
import { DeliveryJournal } from "../src/delivery-journal.js";

test("DeliveryTracker assigns monotonically increasing sequences", () => {
  const tracker = new DeliveryTracker({ streamId: "test" });
  assert.equal(tracker.track("evt_a"), 1);
  assert.equal(tracker.track("evt_b"), 2);
  assert.equal(tracker.track("evt_c"), 3);
  assert.equal(tracker.cursor, "test:3");
});

test("DeliveryTracker acknowledges events and advances cursor", () => {
  const tracker = new DeliveryTracker({ streamId: "test" });
  tracker.track("evt_a");
  tracker.track("evt_b");
  tracker.track("evt_c");

  tracker.ack("evt_a");
  assert.equal(tracker.isAcknowledged("evt_a"), true);
  assert.equal(tracker.isPending("evt_a"), false);

  tracker.ack("evt_b");
  assert.equal(tracker.lastAcknowledgedCursor, "test:2");

  assert.equal(tracker.isPending("evt_c"), true);
  assert.equal(tracker.stats.pending, 1);
  assert.equal(tracker.stats.acknowledged, 2);
});

test("DeliveryTracker NAcks and retries events", () => {
  const tracker = new DeliveryTracker();
  tracker.track("evt_retry");

  tracker.nack("evt_retry");
  const pending = tracker.getPending();
  assert.equal(pending[0].attempts, 2);
  assert.equal(tracker.hasAttemptsRemaining("evt_retry", 3), true);

  tracker.nack("evt_retry");
  assert.equal(tracker.hasAttemptsRemaining("evt_retry", 3), false);
});

test("DeliveryTracker dead-letters exhausted events", () => {
  const tracker = new DeliveryTracker();
  tracker.track("evt_dl");

  tracker.nack("evt_dl"); // attempt 2
  tracker.nack("evt_dl"); // attempt 3 (max)

  const dlEvent = tracker.deadLetter("evt_dl", {
    error: { code: "session_timeout", message: "consumer unresponsive" }
  });

  assert.ok(dlEvent);
  assert.equal(dlEvent.type, "event.dead_lettered");
  assert.equal(dlEvent.payload.original_event_id, "evt_dl");
  assert.equal(dlEvent.payload.attempts, 3);
  assert.equal(dlEvent.payload.error.code, "session_timeout");

  assert.equal(tracker.isPending("evt_dl"), false);
  assert.equal(tracker.deadLettered.size, 1);
  assert.equal(tracker.stats.deadLettered, 1);
});

test("retryDelay computes exponential backoff", () => {
  assert.equal(retryDelay(1), 1000);       // 1000 * 2^0
  assert.equal(retryDelay(2), 2000);       // 1000 * 2^1
  assert.equal(retryDelay(3), 4000);       // 1000 * 2^2
  assert.equal(retryDelay(4), 8000);       // 1000 * 2^3
});

test("retryDelay respects max_backoff_ms", () => {
  const delay20 = retryDelay(20);
  assert.equal(delay20, 30000);
});

test("DeliveryTracker.getPendingForSubscription filters by subscription", () => {
  const tracker = new DeliveryTracker();
  tracker.track("evt_1", "sub_a");
  tracker.track("evt_2", "sub_b");
  tracker.track("evt_3", "sub_a");

  const subA = tracker.getPendingForSubscription("sub_a");
  assert.equal(subA.length, 2);
  assert.equal(subA[0].eventId, "evt_1");
  assert.equal(subA[1].eventId, "evt_3");
});

test("DeliveryTracker.stats reports comprehensive state", () => {
  const tracker = new DeliveryTracker();
  tracker.track("evt_stats_1");
  tracker.track("evt_stats_2");
  tracker.track("evt_stats_3");

  tracker.ack("evt_stats_1");
  tracker.nack("evt_stats_3");
  tracker.nack("evt_stats_3");
  tracker.deadLetter("evt_stats_3", {});

  const stats = tracker.stats;
  assert.equal(stats.totalSequences, 3);
  assert.equal(stats.pending, 1);    // evt_stats_2
  assert.equal(stats.acknowledged, 1); // evt_stats_1
  assert.equal(stats.deadLettered, 1); // evt_stats_3
});

test("DeliveryTracker uses provided store and journal", () => {
  const store = new InMemoryDeliveryStore();
  const journal = new DeliveryJournal();
  const tracker = new DeliveryTracker({ store, journal });

  const seq = tracker.track("evt_store_001");
  assert.equal(seq, 1);
  assert.equal(store.isPending("evt_store_001"), true);

  tracker.ack("evt_store_001");
  assert.equal(store.isAcknowledged("evt_store_001"), true);

  journal.append({ type: "task.submitted" });
  assert.equal(journal.getStats().totalEvents, 1);

  const stats = tracker.stats;
  assert.equal(stats.pending, 0);
  assert.equal(stats.acknowledged, 1);
});
