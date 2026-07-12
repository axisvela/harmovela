#!/usr/bin/env node
import { AepRuntimeService, defaultConfig } from "@axisrobo/aep";

const config = defaultConfig();
config.delivery.store = "memory";
config.transports.websocket.enabled = false;
config.transports.sse.enabled = false;
config.transports.api.enabled = false;

const service = new AepRuntimeService(config);
service.subscribe("task.*", (event) => {
  console.log(`received ${event.type} ${event.id}`);
});

await service.start();
service.publish({
  spec_version: "0.2",
  id: "evt_embed",
  type: "task.submitted",
  source: "example:sdk",
  created_at: new Date().toISOString(),
  payload: { task_id: "task_01" }
});
await service.stop();
