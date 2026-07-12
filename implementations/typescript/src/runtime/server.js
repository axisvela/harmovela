#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { HarmovelaRuntimeService } from "./service.js";

export async function startDaemon({ configPath } = {}) {
  const config = await loadConfig(configPath);
  const service = new HarmovelaRuntimeService(config);
  await service.start();
  const ws = service.transports.websocket?.port;
  const sse = service.transports.sse?.port;
  console.log(`harmovelad started ws=${ws ?? "disabled"} sse=${sse ?? "disabled"}`);
  process.on("SIGINT", async () => {
    await service.stop();
    process.exit(0);
  });
  return service;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startDaemon({ configPath: process.env.HARMOVELA_CONFIG }).catch((err) => {
    console.error(`harmovelad: ${err.message}`);
    process.exitCode = 1;
  });
}
