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

test("AepRuntimeService exposes HTTP health status endpoint", async () => {
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.enabled = false;
  config.transports.sse.enabled = false;
  config.transports.status = { enabled: true, host: "127.0.0.1", port: 0, path: "/healthz" };
  const service = new AepRuntimeService(config);
  await service.start();
  const port = service.transports.status.port;
  const response = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.runtime.id, "aepd-local");
  assert.equal(body.delivery.pending, 0);
  await service.stop();
});
