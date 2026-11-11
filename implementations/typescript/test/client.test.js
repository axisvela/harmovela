import assert from "node:assert/strict";
import test from "node:test";
import { HarmovelaRuntimeService, defaultConfig } from "@axisvela/harmovela-runtime";
import { HarmovelaClient, HarmovelaClientError } from "@axisvela/harmovela-client";

function apiConfig() {
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.enabled = false;
  config.transports.sse.enabled = false;
  config.transports.api = {
    enabled: true,
    host: "127.0.0.1",
    port: 0,
    path: "/aep/api"
  };
  return config;
}

function event(overrides = {}) {
  return {
    spec_version: "0.2",
    id: `evt_${Date.now()}_${Math.random()}`,
    type: "task.submitted",
    source: "client-test",
    created_at: new Date().toISOString(),
    payload: {},
    ...overrides
  };
}

async function startClient() {
  const service = new HarmovelaRuntimeService(apiConfig());
  await service.start();
  const port = service.transports.api.port;
  const client = new HarmovelaClient({
    baseUrl: `http://127.0.0.1:${port}`
  });
  return { service, client };
}

test("client exposes health, stats, pending, and dead-letter endpoints", async () => {
  const { service, client } = await startClient();
  try {
    const health = await client.health();
    assert.equal(health.status, "ok");
    assert.equal(health.runtime.id, "harmovelad-local");

    const accepted = await client.publish(event({ id: "evt_client_health" }));
    assert.equal(accepted.accepted, true);
    assert.equal(accepted.id, "evt_client_health");

    const stats = await client.stats();
    assert.equal(stats.pending, 1);
    const pending = await client.pending();
    assert.equal(pending.pending, 1);
    assert.equal(pending.records[0].eventId, "evt_client_health");
    const dlq = await client.deadLettered();
    assert.equal(dlq.deadLettered, 0);
  } finally {
    await service.stop();
  }
});

test("client rejects invalid events before sending", async () => {
  const { service, client } = await startClient();
  try {
    await assert.rejects(
      () => client.publish({ type: "task.submitted" }),
      (error) => {
        assert.ok(error instanceof HarmovelaClientError);
        assert.match(error.message, /invalid Harmovela event/);
        assert.equal(error.status, 0);
        return true;
      }
    );
  } finally {
    await service.stop();
  }
});

test("client manages subscriptions and polls buffered events", async () => {
  const { service, client } = await startClient();
  try {
    const created = await client.createSubscription({ types: "task.*" });
    assert.match(created.id, /^sub_/);
    const listed = await client.listSubscriptions();
    assert.equal(listed.length, 1);
    const loaded = await client.getSubscription(created.id);
    assert.equal(loaded.id, created.id);

    await client.publish(event({ id: "evt_match", type: "task.submitted" }));
    await client.publish(event({ id: "evt_skip", type: "session.opened" }));
    const events = await client.poll(created.id);
    assert.equal(events.length, 1);
    assert.equal(events[0].id, "evt_match");

    const deleted = await client.deleteSubscription(created.id);
    assert.equal(deleted.deleted, true);
    await assert.rejects(
      () => client.getSubscription(created.id),
      (error) => error instanceof HarmovelaClientError && error.status === 404
    );
  } finally {
    await service.stop();
  }
});

test("client streams live events and stops on abort", async () => {
  const { service, client } = await startClient();
  try {
    const created = await client.createSubscription({ types: "task.*" });
    const controller = new AbortController();
    const received = [];
    const streaming = client
      .stream(created.id, (event) => received.push(event), {
        signal: controller.signal
      })
      .catch((error) => {
        if (error.name !== "AbortError") throw error;
      });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await client.publish(event({ id: "evt_stream", type: "task.completed" }));
    const deadline = Date.now() + 2000;
    while (received.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(received.length, 1);
    assert.equal(received[0].id, "evt_stream");
    controller.abort();
    await streaming;
  } finally {
    await service.stop();
  }
});

test("client maps non-2xx responses to typed errors", async () => {
  const { service, client } = await startClient();
  try {
    await assert.rejects(
      () => client.getSubscription("missing"),
      (error) => {
        assert.ok(error instanceof HarmovelaClientError);
        assert.equal(error.status, 404);
        return true;
      }
    );
  } finally {
    await service.stop();
  }
});
