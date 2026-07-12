import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { InMemoryDeliveryStore } from "../delivery-store-memory.js";
import { SqliteDeliveryStore } from "../delivery-store-sqlite.js";
import { PostgresDeliveryStore } from "../delivery-store-postgres.js";

export function defaultConfig() {
  return {
    spec_version: "0.2",
    runtime: { id: "harmovelad-local", source: "runtime:harmovelad" },
    transports: {
      websocket: { enabled: true, host: "127.0.0.1", port: 8787, path: "/harmovela" },
      sse: { enabled: true, host: "127.0.0.1", port: 8788, path: "/harmovela/events" },
      api: { enabled: true, host: "127.0.0.1", port: 8790, path: "/harmovela/api" },
      stdio: { enabled: false }
    },
    delivery: {
      store: "sqlite",
      sqlite: { path: ".harmovela/harmovela.sqlite" },
      postgres: { url: "postgres://postgres:postgres@localhost:5433/postgres" }
    }
  };
}

export async function writeDefaultConfig(filePath = "harmovela.config.json") {
  await mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
  const text = JSON.stringify(defaultConfig(), null, 2) + "\n";
  await writeFile(filePath, text, "utf8");
  return filePath;
}

export async function loadConfig(filePath = process.env.HARMOVELA_CONFIG ?? "harmovela.config.json", env = process.env) {
  const text = await readFile(filePath, "utf8");
  const parsed = JSON.parse(text);
  return applyEnvOverrides(parsed, env);
}

export function applyEnvOverrides(config, env = process.env) {
  const next = structuredClone(config);
  if (env.AEPD_HOST) {
    next.transports.websocket.host = env.AEPD_HOST;
    next.transports.sse.host = env.AEPD_HOST;
  }
  if (env.AEPD_WS_PORT) next.transports.websocket.port = Number(env.AEPD_WS_PORT);
  if (env.AEPD_SSE_PORT) next.transports.sse.port = Number(env.AEPD_SSE_PORT);
  if (env.AEPD_API_PORT) next.transports.api.port = Number(env.AEPD_API_PORT);
  if (env.AEP_POSTGRES_URL) next.delivery.postgres.url = env.AEP_POSTGRES_URL;
  return next;
}

export function createDeliveryStore(config) {
  const delivery = config.delivery ?? { store: "memory" };
  if (delivery.store === "memory") return new InMemoryDeliveryStore();
  if (delivery.store === "sqlite") return new SqliteDeliveryStore(delivery.sqlite?.path ?? ":memory:");
  if (delivery.store === "postgres") {
    return new PostgresDeliveryStore(delivery.postgres?.url ?? process.env.AEP_POSTGRES_URL, {
      streamId: delivery.stream_id ?? "stream_01"
    });
  }
  throw new Error(`unsupported delivery store: ${delivery.store}`);
}
