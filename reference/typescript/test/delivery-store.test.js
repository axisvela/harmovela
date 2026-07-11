import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryDeliveryStore } from "../src/delivery-store-memory.js";

test("InMemoryDeliveryStore tracks and acknowledges events", () => {
  const store = new InMemoryDeliveryStore();

  const seq = store.track("evt_001", "sub_01", { eventId: "evt_001", subscriptionId: "sub_01" });
  assert.equal(seq, 1);

  assert.equal(store.isPending("evt_001"), true);
  assert.equal(store.isAcknowledged("evt_001"), false);

  const acked = store.ack("evt_001");
  assert.equal(acked, true);
  assert.equal(store.isAcknowledged("evt_001"), true);
  assert.equal(store.isPending("evt_001"), false);
});

test("InMemoryDeliveryStore nacks and increments attempts", () => {
  const store = new InMemoryDeliveryStore();

  store.track("evt_001", "sub_01", {});
  const attempts = store.nack("evt_001");
  assert.equal(attempts, 2);

  const pending = store.getPending();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].attempts, 2);
});

test("InMemoryDeliveryStore dead-letters exhausted events", () => {
  const store = new InMemoryDeliveryStore();

  store.track("evt_001", "sub_01", {});
  const dlq = store.deadLetter("evt_001", { error: { code: "timeout", message: "no ack" } });
  assert.ok(dlq);
  assert.equal(dlq.payload.attempts, 1);
  assert.equal(dlq.payload.original_event_id, "evt_001");
  assert.equal(store.isPending("evt_001"), false);
});

test("InMemoryDeliveryStore lists dead-lettered records", () => {
  const store = new InMemoryDeliveryStore();
  store.track("evt_001", "sub_01", {});
  store.deadLetter("evt_001", { error: { code: "timeout" } });

  const records = store.getDeadLettered();
  assert.equal(records.length, 1);
  assert.equal(records[0].eventId, "evt_001");
  assert.equal(records[0].subscriptionId, "sub_01");
  assert.equal(records[0].reason.error.code, "timeout");
});

test("InMemoryDeliveryStore provides stats", () => {
  const store = new InMemoryDeliveryStore();
  store.track("evt_a", "sub_01", {});
  store.track("evt_b", "sub_01", {});
  store.ack("evt_a");
  store.track("evt_c", "sub_02", {});
  store.deadLetter("evt_c", {});

  const stats = store.getStats();
  assert.equal(stats.totalSequences, 3);
  assert.equal(stats.pending, 1);
  assert.equal(stats.acknowledged, 1);
  assert.equal(stats.deadLettered, 1);
});

test("InMemoryDeliveryStore nack returns false for unknown events", () => {
  const store = new InMemoryDeliveryStore();
  assert.equal(store.nack("nonexistent"), false);
});

test("InMemoryDeliveryStore deadLetter returns null for unknown events", () => {
  const store = new InMemoryDeliveryStore();
  assert.equal(store.deadLetter("nonexistent"), null);
});

test("InMemoryDeliveryStore hasAttemptsRemaining checks max attempts", () => {
  const store = new InMemoryDeliveryStore();
  store.track("evt_001", "sub_01", {});
  assert.equal(store.hasAttemptsRemaining("evt_001", 3), true);
  store.nack("evt_001");
  store.nack("evt_001");
  assert.equal(store.hasAttemptsRemaining("evt_001", 3), false);
});

test("InMemoryDeliveryStore getPendingForSubscription filters correctly", () => {
  const store = new InMemoryDeliveryStore();
  store.track("evt_a", "sub_01", {});
  store.track("evt_b", "sub_02", {});
  store.track("evt_c", "sub_01", {});

  const filtered = store.getPendingForSubscription("sub_01");
  assert.equal(filtered.length, 2);
  assert.deepEqual(filtered.map((e) => e.eventId), ["evt_a", "evt_c"]);
});

test("InMemoryDeliveryStore persists subscriptions", () => {
  const store = new InMemoryDeliveryStore();
  const record = store.createSubscription({ id: "sub_1", filter: { types: "task.*" }, created_at: "2026-07-11T10:00:00Z" });
  assert.equal(record.id, "sub_1");
  assert.equal(store.getSubscription("sub_1").filter.types, "task.*");
  assert.equal(store.listSubscriptions().length, 1);
  assert.equal(store.deleteSubscription("sub_1"), true);
  assert.equal(store.getSubscription("sub_1"), null);
  assert.equal(store.deleteSubscription("sub_1"), false);
});
