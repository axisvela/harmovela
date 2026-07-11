import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  defaultConfig,
  writeDefaultConfig,
  loadConfig,
  applyEnvOverrides,
  createDeliveryStore
} from "../src/runtime/config.js";
import { InMemoryDeliveryStore } from "../src/delivery-store-memory.js";
import { SqliteDeliveryStore } from "../src/delivery-store-sqlite.js";

test("defaultConfig returns local sqlite runtime config", () => {
  const config = defaultConfig();
  assert.equal(config.aep_version, "0.1");
  assert.equal(config.runtime.id, "aepd-local");
  assert.equal(config.delivery.store, "sqlite");
  assert.equal(config.transports.websocket.port, 8787);
  assert.equal(config.transports.sse.port, 8788);
});

test("writeDefaultConfig creates JSON file", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aep-config-"));
  const file = path.join(dir, "aep.config.json");
  await writeDefaultConfig(file);
  const parsed = JSON.parse(await readFile(file, "utf8"));
  assert.equal(parsed.runtime.source, "runtime:aepd");
  await rm(dir, { recursive: true, force: true });
});

test("loadConfig reads JSON and applies env overrides", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aep-config-"));
  const file = path.join(dir, "aep.config.json");
  await writeFile(file, JSON.stringify(defaultConfig()), "utf8");
  const config = await loadConfig(file, {
    AEPD_HOST: "0.0.0.0",
    AEPD_WS_PORT: "9001",
    AEPD_SSE_PORT: "9002",
    AEP_POSTGRES_URL: "postgres://example/db"
  });
  assert.equal(config.transports.websocket.host, "0.0.0.0");
  assert.equal(config.transports.websocket.port, 9001);
  assert.equal(config.transports.sse.port, 9002);
  assert.equal(config.delivery.postgres.url, "postgres://example/db");
  await rm(dir, { recursive: true, force: true });
});

test("applyEnvOverrides ignores absent env fields", () => {
  const config = applyEnvOverrides(defaultConfig(), {});
  assert.equal(config.transports.websocket.host, "127.0.0.1");
});

test("createDeliveryStore creates memory and sqlite stores", async () => {
  const memory = createDeliveryStore({ delivery: { store: "memory" } });
  assert.ok(memory instanceof InMemoryDeliveryStore);

  const sqlite = createDeliveryStore({
    delivery: { store: "sqlite", sqlite: { path: ":memory:" } }
  });
  assert.ok(sqlite instanceof SqliteDeliveryStore);
  sqlite.close();
});
