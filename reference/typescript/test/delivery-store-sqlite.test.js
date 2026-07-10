import assert from "node:assert/strict";
import test from "node:test";
import { SqliteDeliveryStore } from "../src/delivery-store-sqlite.js";
import { DeliveryTracker } from "../src/delivery.js";
import { DeliveryJournal } from "../src/delivery-journal.js";

test("SqliteDeliveryStore tracks and acknowledges events", () => {
  const store = new SqliteDeliveryStore(":memory:");
  const seq = store.track("evt_001", "sub_01");
  assert.equal(seq, 1);
  assert.equal(store.isPending("evt_001"), true);
  assert.equal(store.isAcknowledged("evt_001"), false);
  assert.equal(store.ack("evt_001"), true);
  assert.equal(store.isAcknowledged("evt_001"), true);
  assert.equal(store.isPending("evt_001"), false);
  store.close();
});

test("SqliteDeliveryStore nacks and increments attempts", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_001", "sub_01");
  const attempts = store.nack("evt_001");
  assert.equal(attempts, 2);
  const pending = store.getPending();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].attempts, 2);
  store.close();
});

test("SqliteDeliveryStore dead-letters events", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_001", "sub_01");
  const dlq = store.deadLetter("evt_001", { error: { code: "timeout" } });
  assert.ok(dlq);
  assert.equal(dlq.type, "event.dead_lettered");
  assert.equal(store.isPending("evt_001"), false);
  store.close();
});

test("SqliteDeliveryStore works with DeliveryTracker", () => {
  const store = new SqliteDeliveryStore(":memory:");
  const journal = new DeliveryJournal();
  const tracker = new DeliveryTracker({ store, journal });
  tracker.track("evt_001");
  assert.equal(tracker.isPending("evt_001"), true);
  tracker.ack("evt_001");
  assert.equal(tracker.isAcknowledged("evt_001"), true);
  store.close();
});

test("SqliteDeliveryStore provides stats", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_a", "sub_01");
  store.track("evt_b", "sub_01");
  store.ack("evt_a");
  store.track("evt_c", "sub_02");
  store.deadLetter("evt_c");
  const stats = store.getStats();
  assert.equal(stats.totalSequences, 3);
  assert.equal(stats.pending, 1);
  assert.equal(stats.acknowledged, 1);
  assert.equal(stats.deadLettered, 1);
  store.close();
});

test("SqliteDeliveryStore getPendingForSubscription filters", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_a", "sub_01");
  store.track("evt_b", "sub_02");
  store.track("evt_c", "sub_01");
  const filtered = store.getPendingForSubscription("sub_01");
  assert.equal(filtered.length, 2);
  store.close();
});

test("SqliteDeliveryStore hasAttemptsRemaining checks max", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.track("evt_001", "sub_01");
  assert.equal(store.hasAttemptsRemaining("evt_001", 3), true);
  store.nack("evt_001");
  store.nack("evt_001");
  assert.equal(store.hasAttemptsRemaining("evt_001", 3), false);
  store.close();
});
