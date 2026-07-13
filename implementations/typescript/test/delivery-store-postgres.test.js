import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { PostgresDeliveryStore } from "@axisrobo/harmovela-recovery";

function pgUrl() {
  return process.env.AEP_POSTGRES_URL ?? "postgres://postgres:postgres@localhost:5433/postgres";
}

async function newStore() {
  const prefix = "test_" + randomBytes(6).toString("hex");
  const store = new PostgresDeliveryStore(pgUrl(), { streamId: "stream_01", tablePrefix: prefix, dropOnClose: true });
  await store.init();
  return store;
}

test("PostgresDeliveryStore tracks and acknowledges events", async () => {
  const store = await newStore();
  const seq = await store.track("evt_001", "sub_01");
  assert.equal(seq, 1);
  assert.equal(await store.isPending("evt_001"), true);
  assert.equal(await store.isAcknowledged("evt_001"), false);
  assert.equal(await store.ack("evt_001"), true);
  assert.equal(await store.isAcknowledged("evt_001"), true);
  assert.equal(await store.isPending("evt_001"), false);
  await store.close();
});

test("PostgresDeliveryStore nacks and increments attempts", async () => {
  const store = await newStore();
  await store.track("evt_001", "sub_01");
  const attempts = await store.nack("evt_001");
  assert.equal(attempts, 2);
  await store.close();
});

test("PostgresDeliveryStore dead-letters events", async () => {
  const store = await newStore();
  await store.track("evt_001", "sub_01");
  const dlq = await store.deadLetter("evt_001", { error: { code: "timeout" } });
  assert.ok(dlq);
  assert.equal(dlq.type, "event.dead_lettered");
  assert.equal(await store.isPending("evt_001"), false);
  await store.close();
});

test("PostgresDeliveryStore lists dead-lettered records", async () => {
  const store = await newStore();
  await store.track("evt_001", "sub_01");
  await store.deadLetter("evt_001", { error: { code: "timeout" } });

  const records = await store.getDeadLettered();
  assert.equal(records.length, 1);
  assert.equal(records[0].eventId, "evt_001");
  assert.equal(records[0].subscriptionId, "sub_01");
  assert.equal(records[0].reason.error.code, "timeout");
  await store.close();
});

test("PostgresDeliveryStore provides stats", async () => {
  const store = await newStore();
  await store.track("evt_a", "sub_01");
  await store.track("evt_b", "sub_01");
  await store.ack("evt_a");
  await store.track("evt_c", "sub_02");
  await store.deadLetter("evt_c");
  const stats = await store.getStats();
  assert.equal(stats.totalSequences, 3);
  assert.equal(stats.pending, 1);
  assert.equal(stats.acknowledged, 1);
  assert.equal(stats.deadLettered, 1);
  await store.close();
});

test("PostgresDeliveryStore getPendingForSubscription filters", async () => {
  const store = await newStore();
  await store.track("evt_a", "sub_01");
  await store.track("evt_b", "sub_02");
  await store.track("evt_c", "sub_01");
  const filtered = await store.getPendingForSubscription("sub_01");
  assert.equal(filtered.length, 2);
  await store.close();
});

test("PostgresDeliveryStore hasAttemptsRemaining checks max", async () => {
  const store = await newStore();
  await store.track("evt_001", "sub_01");
  assert.equal(await store.hasAttemptsRemaining("evt_001", 3), true);
  await store.nack("evt_001");
  await store.nack("evt_001");
  assert.equal(await store.hasAttemptsRemaining("evt_001", 3), false);
  await store.close();
});

test("PostgresDeliveryStore persists subscriptions", async () => {
  const store = await newStore();
  await store.createSubscription({ id: "sub_1", filter: { types: "task.*" }, created_at: "2026-07-11T10:00:00Z" });
  const got = await store.getSubscription("sub_1");
  assert.equal(got.filter.types, "task.*");
  const list = await store.listSubscriptions();
  assert.equal(list.length, 1);
  assert.equal(await store.deleteSubscription("sub_1"), true);
  assert.equal(await store.getSubscription("sub_1"), null);
  assert.equal(await store.deleteSubscription("sub_1"), false);
  await store.close();
});
