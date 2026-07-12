#!/usr/bin/env node
import { WsClientTransport } from "@axisrobo/aep";

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const url = argValue("--url", "ws://127.0.0.1:8787/aep");

const subscriber = new WsClientTransport({ url });
subscriber.on("message", async (event) => {
  console.log(`received ${event.type} ${event.id}`);
  await subscriber.stop();
  process.exit(0);
});
subscriber.on("error", (err) => {
  console.error(`emit-and-subscribe: ${err.message}. Is harmovelad running?`);
  process.exitCode = 1;
});

try {
  await subscriber.start();
  const emitter = new WsClientTransport({ url });
  await emitter.start();
  emitter.send({
    spec_version: "0.2",
    id: "evt_ws_example",
    type: "task.submitted",
    source: "example:service",
    created_at: new Date().toISOString(),
    payload: { task_id: "task_01" }
  });
  await emitter.stop();
} catch (err) {
  console.error(`emit-and-subscribe: ${err.message}. Is harmovelad running?`);
  process.exitCode = 1;
}
