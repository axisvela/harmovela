#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { AepRuntimeService } from "./service.js";

export async function startDaemon({ configPath } = {}) {
  const config = await loadConfig(configPath);
  const service = new AepRuntimeService(config);
  await service.start();
  const ws = service.transports.websocket?.port;
  const sse = service.transports.sse?.port;
  console.log(`aepd started ws=${ws ?? "disabled"} sse=${sse ?? "disabled"}`);
  process.on("SIGINT", async () => {
    await service.stop();
    process.exit(0);
  });
  return service;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startDaemon({ configPath: process.env.AEP_CONFIG }).catch((err) => {
    console.error(`aepd: ${err.message}`);
    process.exitCode = 1;
  });
}
