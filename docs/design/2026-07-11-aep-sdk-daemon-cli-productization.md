# AEP SDK, Daemon, And CLI Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the TypeScript reference implementation into a usable first productization layer: embeddable SDK surface, runnable `aepd` daemon, and `aep` CLI.

**Architecture:** Keep the first implementation under `implementations/typescript` to avoid monorepo restructuring after tag `2.0`. Build small focused modules: config loading/generation, runtime service composition, daemon entrypoint, CLI command dispatcher, command handlers, and tests. Runtime service reuses existing router, validation, delivery stores, WebSocket/SSE transports, and conformance CLI rather than creating a new framework.

**Tech Stack:** Node.js >=20 ESM, `node:test`, existing `ws`, `better-sqlite3`, `pg`, TypeScript reference modules.

**Design reference:** `docs/superpowers/specs/2026-07-11-aep-sdk-daemon-cli-productization-design.md`

---

## File Structure

- Create `implementations/typescript/src/runtime/config.js`: default config, config file generation, environment overrides, store creation helpers.
- Create `implementations/typescript/src/runtime/service.js`: `AepRuntimeService` class that wires router, delivery store, WebSocket and SSE transports.
- Create `implementations/typescript/src/runtime/server.js`: executable `aepd` entrypoint.
- Create `implementations/typescript/src/cli/aep.js`: executable CLI dispatcher.
- Create command modules under `implementations/typescript/src/cli/commands/`: `init.js`, `start.js`, `emit.js`, `subscribe.js`, `dlq.js`, `conformance.js`.
- Modify `implementations/typescript/src/index.js`: export runtime/config/service and delivery stores as SDK surface.
- Modify `implementations/typescript/package.json`: add `bin.aep`, `bin.aepd`, and scripts.
- Create tests: `test/runtime-config.test.js`, `test/runtime-service.test.js`, `test/cli.test.js`.
- Create docs/example: `implementations/typescript/examples/runtime-service/README.md`.

Implementation should be minimal. Do not add auth, UI, Kubernetes, agent abstractions, workflow APIs, or protocol-version negotiation.

---

## Task 1: Runtime Config

**Files:**
- Create: `implementations/typescript/src/runtime/config.js`
- Test: `implementations/typescript/test/runtime-config.test.js`

- [ ] **Step 1: Write failing config tests**

Create `implementations/typescript/test/runtime-config.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd implementations/typescript && node --test test/runtime-config.test.js`

Expected: FAIL with module-not-found for `src/runtime/config.js`.

- [ ] **Step 3: Implement config module**

Create `implementations/typescript/src/runtime/config.js`:

```javascript
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { InMemoryDeliveryStore } from "../delivery-store-memory.js";
import { SqliteDeliveryStore } from "../delivery-store-sqlite.js";
import { PostgresDeliveryStore } from "../delivery-store-postgres.js";

export function defaultConfig() {
  return {
    aep_version: "0.1",
    runtime: { id: "aepd-local", source: "runtime:aepd" },
    transports: {
      websocket: { enabled: true, host: "127.0.0.1", port: 8787, path: "/aep" },
      sse: { enabled: true, host: "127.0.0.1", port: 8788, path: "/aep/events" },
      stdio: { enabled: false }
    },
    delivery: {
      store: "sqlite",
      sqlite: { path: ".aep/aep.sqlite" },
      postgres: { url: "postgres://postgres:postgres@localhost:5433/postgres" }
    }
  };
}

export async function writeDefaultConfig(filePath = "aep.config.json") {
  await mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
  const text = JSON.stringify(defaultConfig(), null, 2) + "\n";
  await writeFile(filePath, text, "utf8");
  return filePath;
}

export async function loadConfig(filePath = process.env.AEP_CONFIG ?? "aep.config.json", env = process.env) {
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
```

- [ ] **Step 4: Run config tests**

Run: `cd implementations/typescript && node --test test/runtime-config.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add implementations/typescript/src/runtime/config.js implementations/typescript/test/runtime-config.test.js
git commit -m "feat: add AEP runtime config loader"
```

---

## Task 2: Runtime Service

**Files:**
- Create: `implementations/typescript/src/runtime/service.js`
- Test: `implementations/typescript/test/runtime-service.test.js`

- [ ] **Step 1: Write failing runtime service tests**

Create `implementations/typescript/test/runtime-service.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd implementations/typescript && node --test test/runtime-service.test.js`

Expected: FAIL with module-not-found for `src/runtime/service.js`.

- [ ] **Step 3: Implement runtime service**

Create `implementations/typescript/src/runtime/service.js`:

```javascript
import { EventRouter } from "../router.js";
import { validateEnvelope } from "../validate.js";
import { WsServerTransport } from "../transport/websocket.js";
import { SseServerTransport } from "../transport/sse.js";
import { createDeliveryStore } from "./config.js";

export class AepRuntimeService {
  constructor(config, options = {}) {
    this.config = config;
    this.router = options.router ?? new EventRouter();
    this.store = options.store ?? createDeliveryStore(config);
    this.transports = {};
    this.started = false;
  }

  subscribe(pattern, handler) {
    this.router.on(pattern, handler);
    return this;
  }

  publish(event) {
    const errors = validateEnvelope(event);
    if (errors.length > 0) {
      throw new Error(`invalid AEP event: ${errors.join("; ")}`);
    }
    this.store.track?.(event.id, event.subscription_id ?? "_runtime");
    this.router.dispatch(event);
    for (const transport of Object.values(this.transports)) {
      transport.send(event);
    }
    return event;
  }

  async start() {
    if (this.started) return;
    const ws = this.config.transports?.websocket;
    if (ws?.enabled) {
      const transport = new WsServerTransport({ host: ws.host, port: ws.port, path: ws.path ?? "/aep" });
      transport.on("message", (event) => this.publish(stripPrivateFields(event)));
      await transport.start();
      this.transports.websocket = transport;
    }
    const sse = this.config.transports?.sse;
    if (sse?.enabled) {
      const transport = new SseServerTransport({ host: sse.host, port: sse.port, path: sse.path ?? "/aep/events" });
      transport.on("message", (event) => this.publish(event));
      await transport.start();
      this.transports.sse = transport;
    }
    this.started = true;
  }

  async stop() {
    const transports = Object.values(this.transports).reverse();
    for (const transport of transports) await transport.stop();
    this.transports = {};
    this.store.close?.();
    this.started = false;
  }

  getStats() {
    return this.store.getStats?.() ?? {};
  }

  getPending() {
    return this.store.getPending?.() ?? [];
  }
}

function stripPrivateFields(event) {
  const { _ws, ...publicEvent } = event;
  return publicEvent;
}
```

- [ ] **Step 4: Run runtime service tests**

Run: `cd implementations/typescript && node --test test/runtime-service.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add implementations/typescript/src/runtime/service.js implementations/typescript/test/runtime-service.test.js
git commit -m "feat: add AEP runtime service"
```

---

## Task 3: CLI Dispatcher, init, start, and aepd

**Files:**
- Create: `implementations/typescript/src/cli/aep.js`
- Create: `implementations/typescript/src/cli/commands/init.js`
- Create: `implementations/typescript/src/cli/commands/start.js`
- Create: `implementations/typescript/src/runtime/server.js`
- Test: `implementations/typescript/test/cli.test.js`

- [ ] **Step 1: Write failing CLI tests**

Create `implementations/typescript/test/cli.test.js`:

```javascript
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const cli = path.resolve("src/cli/aep.js");

function run(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd: path.resolve("."), ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("aep init writes config", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aep-cli-"));
  const file = path.join(dir, "aep.config.json");
  const result = await run(["init", "--config", file]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /created/);
  const config = JSON.parse(await readFile(file, "utf8"));
  assert.equal(config.runtime.id, "aepd-local");
  await rm(dir, { recursive: true, force: true });
});

test("aep unknown command exits non-zero", async () => {
  const result = await run(["unknown"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /unknown command/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd implementations/typescript && node --test test/cli.test.js`

Expected: FAIL because `src/cli/aep.js` does not exist.

- [ ] **Step 3: Implement CLI init/start and daemon entrypoint**

Create `implementations/typescript/src/cli/commands/init.js`:

```javascript
import { writeDefaultConfig } from "../../runtime/config.js";

export async function initCommand(args) {
  const file = valueAfter(args, "--config") ?? "aep.config.json";
  await writeDefaultConfig(file);
  console.log(`created ${file}`);
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
```

Create `implementations/typescript/src/cli/commands/start.js`:

```javascript
import { startDaemon } from "../../runtime/server.js";

export async function startCommand(args) {
  const configPath = valueAfter(args, "--config") ?? process.env.AEP_CONFIG ?? "aep.config.json";
  await startDaemon({ configPath });
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
```

Create `implementations/typescript/src/runtime/server.js`:

```javascript
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
```

Create `implementations/typescript/src/cli/aep.js`:

```javascript
#!/usr/bin/env node
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";

const [command, ...args] = process.argv.slice(2);

try {
  if (command === "init") await initCommand(args);
  else if (command === "start") await startCommand(args);
  else if (command === "help" || !command) printHelp();
  else {
    console.error(`unknown command: ${command}`);
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`aep: ${err.message}`);
  process.exitCode = 1;
}

function printHelp() {
  console.log(`Usage: aep <command>\n\nCommands:\n  init\n  start\n`);
}
```

- [ ] **Step 4: Run CLI tests**

Run: `cd implementations/typescript && node --test test/cli.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add implementations/typescript/src/cli implementations/typescript/src/runtime/server.js implementations/typescript/test/cli.test.js
git commit -m "feat: add aep CLI init/start and aepd entrypoint"
```

---

## Task 4: CLI emit and subscribe

**Files:**
- Create: `implementations/typescript/src/cli/commands/emit.js`
- Create: `implementations/typescript/src/cli/commands/subscribe.js`
- Modify: `implementations/typescript/src/cli/aep.js`
- Test: `implementations/typescript/test/cli.test.js`

- [ ] **Step 1: Extend CLI tests for emit argument handling**

Append to `implementations/typescript/test/cli.test.js`:

```javascript
test("aep emit rejects invalid JSON payload", async () => {
  const result = await run(["emit", "task.submitted", "--payload", "{"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /invalid JSON payload/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd implementations/typescript && node --test test/cli.test.js`

Expected: FAIL because `emit` is unknown.

- [ ] **Step 3: Implement emit and subscribe commands**

Create `implementations/typescript/src/cli/commands/emit.js`:

```javascript
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

export async function emitCommand(args) {
  const type = args[0];
  if (!type) throw new Error("emit requires an event type");
  const payloadText = valueAfter(args, "--payload") ?? "{}";
  let payload;
  try { payload = JSON.parse(payloadText); } catch { throw new Error("invalid JSON payload"); }
  const url = valueAfter(args, "--url") ?? "ws://127.0.0.1:8787/aep";
  const event = {
    aep_version: "0.1",
    id: valueAfter(args, "--id") ?? randomUUID(),
    type,
    source: valueAfter(args, "--source") ?? "cli:aep",
    created_at: new Date().toISOString(),
    payload
  };
  await sendWs(url, event);
  console.log(JSON.stringify(event));
}

function sendWs(url, event) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, ["aep-0.1"]);
    ws.on("open", () => { ws.send(JSON.stringify(event)); ws.close(); resolve(); });
    ws.on("error", reject);
  });
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
```

Create `implementations/typescript/src/cli/commands/subscribe.js`:

```javascript
import { WebSocket } from "ws";
import { matchesType } from "../../subscription.js";

export async function subscribeCommand(args) {
  const pattern = valueAfter(args, "--type") ?? "*";
  const url = valueAfter(args, "--url") ?? "ws://127.0.0.1:8787/aep";
  const ws = new WebSocket(url, ["aep-0.1"]);
  ws.on("message", (data) => {
    const event = JSON.parse(data.toString());
    if (matchesType(pattern, event.type)) console.log(JSON.stringify(event));
  });
  ws.on("error", (err) => { console.error(`subscribe: ${err.message}`); process.exitCode = 1; });
  process.on("SIGINT", () => { ws.close(); process.exit(0); });
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
```

Modify `implementations/typescript/src/cli/aep.js` to import and dispatch:

```javascript
import { emitCommand } from "./commands/emit.js";
import { subscribeCommand } from "./commands/subscribe.js";
```

Add branches:

```javascript
else if (command === "emit") await emitCommand(args);
else if (command === "subscribe") await subscribeCommand(args);
```

Update help text to include `emit` and `subscribe`.

- [ ] **Step 4: Run CLI tests**

Run: `cd implementations/typescript && node --test test/cli.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add implementations/typescript/src/cli implementations/typescript/test/cli.test.js
git commit -m "feat: add aep CLI emit and subscribe commands"
```

---

## Task 5: CLI dlq and conformance wrappers

**Files:**
- Create: `implementations/typescript/src/cli/commands/dlq.js`
- Create: `implementations/typescript/src/cli/commands/conformance.js`
- Modify: `implementations/typescript/src/cli/aep.js`

- [ ] **Step 1: Write failing tests for conformance command dispatch**

Append to `implementations/typescript/test/cli.test.js`:

```javascript
test("aep conformance runs conformance command", async () => {
  const result = await run(["conformance", "--level=AEP-C0"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /AEP conformance target/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd implementations/typescript && node --test test/cli.test.js`

Expected: FAIL because `conformance` is unknown.

- [ ] **Step 3: Implement conformance and dlq commands**

Create `implementations/typescript/src/cli/commands/conformance.js`:

```javascript
import { runConformance } from "../../conformance.js";

export async function conformanceCommand(args) {
  const targetArg = args.find((arg) => arg.startsWith("--level="));
  const targetLevel = targetArg ? targetArg.slice("--level=".length) : undefined;
  const { targetLevel: resolvedTarget, results } = runConformance({ targetLevel });
  console.log(`AEP conformance target: ${resolvedTarget}`);
  let failed = false;
  for (const result of results) {
    const label = `${result.fixture.level} ${result.fixture.path}`;
    if (result.status === "skipped") console.log(`SKIP ${label} (${result.reason})`);
    else if (result.status === "passed") console.log(`PASS ${label}`);
    else { failed = true; console.error(`FAIL ${label}`); }
  }
  if (failed) process.exitCode = 1;
}
```

Create `implementations/typescript/src/cli/commands/dlq.js`:

```javascript
import { loadConfig, createDeliveryStore } from "../../runtime/config.js";

export async function dlqCommand(args) {
  const subcommand = args[0] ?? "list";
  if (subcommand !== "list") throw new Error(`unsupported dlq command: ${subcommand}`);
  const configPath = valueAfter(args, "--config") ?? process.env.AEP_CONFIG ?? "aep.config.json";
  const config = await loadConfig(configPath);
  const store = createDeliveryStore(config);
  const stats = store.getStats?.() ?? {};
  console.log(JSON.stringify({ deadLettered: stats.deadLettered ?? 0 }));
  store.close?.();
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
```

Modify `implementations/typescript/src/cli/aep.js` to import and dispatch:

```javascript
import { conformanceCommand } from "./commands/conformance.js";
import { dlqCommand } from "./commands/dlq.js";
```

Add branches:

```javascript
else if (command === "conformance") await conformanceCommand(args);
else if (command === "dlq") await dlqCommand(args);
```

Update help text to include `conformance` and `dlq`.

- [ ] **Step 4: Run CLI tests**

Run: `cd implementations/typescript && node --test test/cli.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add implementations/typescript/src/cli implementations/typescript/test/cli.test.js
git commit -m "feat: add aep CLI dlq and conformance commands"
```

---

## Task 6: SDK Exports, Package Binaries, Docs, Final Verification

**Files:**
- Modify: `implementations/typescript/src/index.js`
- Modify: `implementations/typescript/package.json`
- Create: `implementations/typescript/examples/runtime-service/README.md`
- Modify: `README.md` or `docs/roadmap.md` if needed to mention productization track.

- [ ] **Step 1: Update SDK exports**

Modify `implementations/typescript/src/index.js` to add:

```javascript
export { InMemoryDeliveryStore } from "./delivery-store-memory.js";
export { SqliteDeliveryStore } from "./delivery-store-sqlite.js";
export { PostgresDeliveryStore } from "./delivery-store-postgres.js";
export { defaultConfig, writeDefaultConfig, loadConfig, applyEnvOverrides, createDeliveryStore } from "./runtime/config.js";
export { AepRuntimeService } from "./runtime/service.js";
```

- [ ] **Step 2: Update package binaries and scripts**

Modify `implementations/typescript/package.json` bin section from:

```json
"bin": {
  "aep-harness": "./src/stdio.js"
}
```

to:

```json
"bin": {
  "aep-harness": "./src/stdio.js",
  "aep": "./src/cli/aep.js",
  "aepd": "./src/runtime/server.js"
}
```

Add scripts:

```json
"aep": "node ./src/cli/aep.js",
"aepd": "node ./src/runtime/server.js"
```

- [ ] **Step 3: Add runtime-service README**

Create `implementations/typescript/examples/runtime-service/README.md`:

```markdown
# AEP Runtime Service Example

This example shows the first productized TypeScript shape: SDK + `aepd` + `aep` CLI.

```bash
npm run aep -- init --config aep.config.json
npm run aep -- start --config aep.config.json
```

In another terminal:

```bash
npm run aep -- subscribe --type 'task.*'
```

In a third terminal:

```bash
npm run aep -- emit task.submitted --payload '{"task_id":"task_01"}'
```

The runtime remains protocol-first. It is not an agent framework or workflow engine.
```

- [ ] **Step 4: Run final TypeScript tests**

Run: `cd implementations/typescript && npm test`

Expected: all tests pass.

- [ ] **Step 5: Smoke test CLI init**

Run: `cd implementations/typescript && node ./src/cli/aep.js init --config .aep-test-config.json`

Expected: prints `created .aep-test-config.json`. Delete the generated file after smoke test.

- [ ] **Step 6: Commit**

```bash
git add implementations/typescript/src/index.js implementations/typescript/package.json implementations/typescript/examples/runtime-service/README.md
git commit -m "feat: expose AEP SDK runtime and CLI package entrypoints"
```

---

## Final Verification

- [ ] **Run TypeScript suite**

```bash
cd implementations/typescript && npm test
```

Expected: all TypeScript tests pass.

- [ ] **Run cross-language smoke suites if implementation touched shared docs only outside TS**

```bash
cd implementations/python && python -m pytest
cd implementations/go && go test ./...
cd implementations/java && mvn test
```

Expected: all pass. If only TypeScript files changed after this plan starts, TypeScript suite is the required verification and the other three are optional but preferred before push.

- [ ] **Push only when requested**

```bash
git push origin master
git push origin 2.0
```

Push `2.0` only if the user explicitly asks to publish the tag.
