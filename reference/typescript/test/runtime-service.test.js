import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { WebSocket } from "ws";
import { AepRuntimeService } from "../src/runtime/service.js";
import { defaultConfig } from "../src/runtime/config.js";

function event(overrides = {}) {
  return {
    aep_version: "0.1",
    id: `evt_${Date.now()}_${Math.random()}`,
    type: "task.submitted",
    source: "test",
    created_at: new Date().toISOString(),
    payload: {},
    ...overrides
  };
}

test("AepRuntimeService publishes valid events to router subscribers", async () => {
  const config = defaultConfig();
  config.transports.websocket.enabled = false;
  config.transports.sse.enabled = false;
  config.transports.api.enabled = false;
  config.delivery.store = "memory";
  const service = new AepRuntimeService(config);
  const seen = [];
  service.subscribe("task.*", (evt) => seen.push(evt));
  await service.start();
  service.publish(event({ id: "evt_001" }));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].id, "evt_001");
  await service.stop();
});

test("AepRuntimeService rejects invalid events", async () => {
  const config = defaultConfig();
  config.transports.websocket.enabled = false;
  config.transports.sse.enabled = false;
  config.transports.api.enabled = false;
  config.delivery.store = "memory";
  const service = new AepRuntimeService(config);
  await service.start();
  assert.throws(() => service.publish({ type: "task.submitted" }), /invalid AEP event/);
  await service.stop();
});

test("AepRuntimeService starts websocket transport and broadcasts events", async () => {
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.enabled = true;
  config.transports.websocket.port = 0;
  config.transports.sse.enabled = false;
  config.transports.api.enabled = false;
  const service = new AepRuntimeService(config);
  await service.start();
  const port = service.transports.websocket.port;
  const ws = new WebSocket(`ws://127.0.0.1:${port}/aep`, ["aep-0.1"]);
  await once(ws, "open");
  const received = once(ws, "message");
  service.publish(event({ id: "evt_ws" }));
  const [data] = await received;
  assert.equal(JSON.parse(data.toString()).id, "evt_ws");
  ws.close();
  await service.stop();
});

function apiConfig() {
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.enabled = false;
  config.transports.sse.enabled = false;
  config.transports.api = { enabled: true, host: "127.0.0.1", port: 0, path: "/aep/api" };
  return config;
}

async function startApiService(config) {
  const service = new AepRuntimeService(config);
  await service.start();
  const base = `http://127.0.0.1:${service.transports.api.port}/aep/api`;
  return { service, base };
}

test("api healthz returns runtime and delivery stats", async () => {
  const { service, base } = await startApiService(apiConfig());
  const res = await fetch(`${base}/healthz`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.runtime.id, "aepd-local");
  assert.equal(body.delivery.pending, 0);
  await service.stop();
});

test("api POST events accepts valid event and delivers to subscriber", async () => {
  const { service, base } = await startApiService(apiConfig());
  const seen = [];
  service.subscribe("task.*", (evt) => seen.push(evt));
  const res = await fetch(`${base}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event({ id: "evt_api" }))
  });
  assert.equal(res.status, 202);
  const body = await res.json();
  assert.equal(body.accepted, true);
  assert.equal(body.id, "evt_api");
  assert.equal(seen.length, 1);
  await service.stop();
});

test("api POST events rejects invalid event", async () => {
  const { service, base } = await startApiService(apiConfig());
  const res = await fetch(`${base}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "task.submitted" })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.accepted, false);
  assert.ok(Array.isArray(body.errors));
  await service.stop();
});

test("api POST events rejects malformed JSON", async () => {
  const { service, base } = await startApiService(apiConfig());
  const res = await fetch(`${base}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.accepted, false);
  await service.stop();
});

test("api GET stats and pending reflect published events", async () => {
  const { service, base } = await startApiService(apiConfig());
  service.publish(event({ id: "evt_pending" }));
  const statsRes = await fetch(`${base}/stats`);
  const stats = await statsRes.json();
  assert.equal(stats.pending, 1);
  const pendingRes = await fetch(`${base}/pending`);
  const pending = await pendingRes.json();
  assert.equal(pending.pending, 1);
  assert.equal(pending.records[0].eventId, "evt_pending");
  await service.stop();
});

test("api GET dlq lists dead-lettered records", async () => {
  const { service, base } = await startApiService(apiConfig());
  service.publish(event({ id: "evt_dl" }));
  service.store.deadLetter("evt_dl", { error: { code: "timeout" } });
  const res = await fetch(`${base}/dlq`);
  const body = await res.json();
  assert.equal(body.deadLettered, 1);
  assert.equal(body.records[0].eventId, "evt_dl");
  await service.stop();
});

test("api unknown route returns 404", async () => {
  const { service, base } = await startApiService(apiConfig());
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  await service.stop();
});

test("service registry buffers matching events and drains them", async () => {
  const config = apiConfig();
  const service = new AepRuntimeService(config);
  await service.start();
  const record = await service.createSubscription({ types: "task.*" });
  service.publish(event({ id: "evt_match", type: "task.submitted" }));
  service.publish(event({ id: "evt_skip", type: "session.opened" }));
  const drained = service.takeEvents(record.id, 100);
  assert.equal(drained.length, 1);
  assert.equal(drained[0].id, "evt_match");
  assert.equal(service.takeEvents(record.id, 100).length, 0);
  await service.stop();
});

test("service loads persisted subscriptions on start", async () => {
  const config = apiConfig();
  const service = new AepRuntimeService(config);
  await service.start();
  await service.createSubscription({ types: "task.*" });
  const list = service.listSubscriptions();
  assert.equal(list.length, 1);
  await service.stop();
});

test("api creates, lists, gets, and deletes subscriptions", async () => {
  const { service, base } = await startApiService(apiConfig());
  const createRes = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { types: "task.*" } })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.match(created.id, /^sub_/);

  const listRes = await fetch(`${base}/subscriptions`);
  const list = await listRes.json();
  assert.equal(list.subscriptions.length, 1);

  const getRes = await fetch(`${base}/subscriptions/${created.id}`);
  assert.equal(getRes.status, 200);

  const delRes = await fetch(`${base}/subscriptions/${created.id}`, { method: "DELETE" });
  assert.equal(delRes.status, 200);
  const delBody = await delRes.json();
  assert.equal(delBody.deleted, true);

  const missingRes = await fetch(`${base}/subscriptions/${created.id}`);
  assert.equal(missingRes.status, 404);
  await service.stop();
});

test("api long-poll returns buffered matching events", async () => {
  const { service, base } = await startApiService(apiConfig());
  const createRes = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { types: "task.*" } })
  });
  const { id } = await createRes.json();
  service.publish(event({ id: "evt_lp", type: "task.submitted" }));
  const eventsRes = await fetch(`${base}/subscriptions/${id}/events`);
  assert.equal(eventsRes.status, 200);
  const body = await eventsRes.json();
  assert.equal(body.events.length, 1);
  assert.equal(body.events[0].id, "evt_lp");
  await service.stop();
});
