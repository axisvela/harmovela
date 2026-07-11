# AEP Runtime HTTP API Implementation Plan (Subproject A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `api` HTTP transport to the AEP runtime providing health, event ingest, dlq, pending, and stats endpoints, replacing the standalone status server.

**Architecture:** A new `src/runtime/api-server.js` module builds a single HTTP server started by `AepRuntimeService`. It reads through service delegation methods and ingests through `service.publish()`. Config replaces `transports.status` with `transports.api`. The `aep status` default URL moves to the api health path. Tests drive endpoints with real HTTP requests.

**Tech Stack:** Node.js >=20 ESM, `node:http`, `fetch`, `node:test`, existing runtime modules.

**Design reference:** `docs/superpowers/specs/2026-07-11-aep-runtime-http-api-design.md`

---

## File Structure

- Modify `reference/typescript/src/runtime/config.js`: replace `transports.status` with `transports.api`, add `AEPD_API_PORT` override.
- Create `reference/typescript/src/runtime/api-server.js`: HTTP api server.
- Modify `reference/typescript/src/runtime/service.js`: start api server, add `getDeadLettered()` delegation, remove status branch.
- Modify `reference/typescript/src/cli/aep.js`: update `aep status` default URL.
- Modify `reference/typescript/src/index.js`: export nothing new required, but keep consistent (no change needed unless tests require).
- Modify tests: `test/runtime-config.test.js`, `test/runtime-service.test.js`, `test/cli.test.js`, `test/cli-runtime-e2e.test.js`.

---

## Task 1: Replace status config with api config

**Files:**
- Modify: `reference/typescript/src/runtime/config.js`
- Test: `reference/typescript/test/runtime-config.test.js`

- [ ] **Step 1: Update failing config test**

In `reference/typescript/test/runtime-config.test.js`, replace the three status assertions in `defaultConfig returns local sqlite runtime config`:

```javascript
  assert.equal(config.transports.api.enabled, true);
  assert.equal(config.transports.api.port, 8790);
  assert.equal(config.transports.api.path, "/aep/api");
```

Add an env override assertion to `loadConfig reads JSON and applies env overrides`, after the postgres assertion:

```javascript
  const apiConfig = await loadConfig(file, { AEPD_API_PORT: "9003" });
  assert.equal(apiConfig.transports.api.port, 9003);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/typescript && node --test test/runtime-config.test.js`

Expected: FAIL because `config.transports.api` is undefined.

- [ ] **Step 3: Implement api config**

In `reference/typescript/src/runtime/config.js`, replace the status transport line in `defaultConfig()`:

```javascript
      api: { enabled: true, host: "127.0.0.1", port: 8790, path: "/aep/api" },
```

In `applyEnvOverrides`, add before the return:

```javascript
  if (env.AEPD_API_PORT) next.transports.api.port = Number(env.AEPD_API_PORT);
```

- [ ] **Step 4: Run config tests**

Run: `cd reference/typescript && node --test test/runtime-config.test.js`

Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add reference/typescript/src/runtime/config.js reference/typescript/test/runtime-config.test.js
git commit -m "feat: replace runtime status config with api transport config"
git push origin master
```

---

## Task 2: Implement api HTTP server module

**Files:**
- Create: `reference/typescript/src/runtime/api-server.js`
- Modify: `reference/typescript/src/runtime/service.js`
- Test: `reference/typescript/test/runtime-service.test.js`

- [ ] **Step 1: Write failing api server tests**

Append to `reference/typescript/test/runtime-service.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/typescript && node --test test/runtime-service.test.js`

Expected: FAIL because `service.transports.api` is undefined.

- [ ] **Step 3: Implement api server module**

Create `reference/typescript/src/runtime/api-server.js`:

```javascript
import http from "node:http";

export function startApiServer(service, options) {
  const base = options.path ?? "/aep/api";
  const server = http.createServer((req, res) => {
    handle(service, base, req, res).catch((err) => {
      sendJson(res, 500, { error: err.message });
    });
  });
  return new Promise((resolve) => {
    server.listen(options.port ?? 0, options.host ?? "127.0.0.1", () => {
      const addr = server.address();
      resolve({
        port: addr.port,
        stop: () => new Promise((done) => server.close(done))
      });
    });
  });
}

async function handle(service, base, req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : null;

  if (route === "/healthz" && req.method === "GET") {
    return sendJson(res, 200, {
      status: "ok",
      runtime: service.config.runtime,
      delivery: await service.getStats()
    });
  }

  if (route === "/events" && req.method === "POST") {
    return handleIngest(service, req, res);
  }

  if (route === "/dlq" && req.method === "GET") {
    const records = await service.getDeadLettered();
    return sendJson(res, 200, { deadLettered: records.length, records });
  }

  if (route === "/pending" && req.method === "GET") {
    const records = await service.getPending();
    return sendJson(res, 200, { pending: records.length, records });
  }

  if (route === "/stats" && req.method === "GET") {
    return sendJson(res, 200, await service.getStats());
  }

  return sendJson(res, 404, { error: "not found" });
}

async function handleIngest(service, req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return sendJson(res, 400, { accepted: false, errors: ["invalid JSON body"] });
  }
  try {
    service.publish(event);
  } catch (err) {
    const errors = err.message.startsWith("invalid AEP event: ")
      ? err.message.slice("invalid AEP event: ".length).split("; ")
      : [err.message];
    return sendJson(res, 400, { accepted: false, errors });
  }
  return sendJson(res, 202, { accepted: true, id: event.id });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
```

- [ ] **Step 4: Wire api server into the runtime service**

In `reference/typescript/src/runtime/service.js`:

Replace the import of `http` and the `startStatusServer` usage. First add the api import near the top:

```javascript
import { startApiServer } from "./api-server.js";
```

Replace the status branch in `start()`:

```javascript
    const api = this.config.transports?.api;
    if (api?.enabled) {
      this.transports.api = await startApiServer(this, api);
    }
```

Add a `getDeadLettered()` method to the class, after `getPending()`:

```javascript
  getDeadLettered() {
    return this.store.getDeadLettered?.() ?? [];
  }
```

Remove the now-unused `startStatusServer` function and the `import http from "node:http";` line if no longer used in `service.js`.

- [ ] **Step 5: Run runtime service tests**

Run: `cd reference/typescript && node --test test/runtime-service.test.js`

Expected: PASS, including the existing health status test replaced by api tests. If the old `AepRuntimeService exposes HTTP health status endpoint` test still references `transports.status`, update it to use the api config path or remove it since api healthz now covers it.

- [ ] **Step 6: Remove obsolete status endpoint test**

In `reference/typescript/test/runtime-service.test.js`, delete the old test `AepRuntimeService exposes HTTP health status endpoint` because the api healthz test replaces it.

- [ ] **Step 7: Run runtime service tests again**

Run: `cd reference/typescript && node --test test/runtime-service.test.js`

Expected: PASS.

- [ ] **Step 8: Commit and push**

```bash
git add reference/typescript/src/runtime/api-server.js reference/typescript/src/runtime/service.js reference/typescript/test/runtime-service.test.js
git commit -m "feat: add runtime HTTP api server with events, dlq, pending, stats"
git push origin master
```

---

## Task 3: Update CLI status default and config expectations

**Files:**
- Modify: `reference/typescript/src/cli/aep.js`
- Test: `reference/typescript/test/cli.test.js`

- [ ] **Step 1: Write failing CLI init api config test**

Append to `reference/typescript/test/cli.test.js`:

```javascript
test("aep init writes config containing api transport", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aep-cli-api-"));
  const file = path.join(dir, "aep.config.json");
  const result = await run(["init", "--config", file]);
  assert.equal(result.code, 0);
  const config = JSON.parse(await readFile(file, "utf8"));
  assert.equal(config.transports.api.enabled, true);
  assert.equal(config.transports.api.port, 8790);
  await rm(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify current state**

Run: `cd reference/typescript && node --test test/cli.test.js`

Expected: PASS for this new test because Task 1 already added api config. If it fails, Task 1 was not completed.

- [ ] **Step 3: Update status default URL**

In `reference/typescript/src/cli/aep.js`, change the status command default URL:

```javascript
  .option("--url <url>", "health endpoint URL", "http://127.0.0.1:8790/aep/api/healthz")
```

- [ ] **Step 4: Run CLI tests**

Run: `cd reference/typescript && node --test test/cli.test.js`

Expected: PASS. The existing `aep status prints daemon health JSON` test passes an explicit `--url`, so it is unaffected.

- [ ] **Step 5: Commit and push**

```bash
git add reference/typescript/src/cli/aep.js reference/typescript/test/cli.test.js
git commit -m "feat: point aep status default at runtime api health endpoint"
git push origin master
```

---

## Task 4: Update runtime e2e config references

**Files:**
- Modify: `reference/typescript/test/cli-runtime-e2e.test.js`

- [ ] **Step 1: Check for status references**

Run: `cd reference/typescript && node --test test/cli-runtime-e2e.test.js`

Expected: PASS. The e2e tests set `config.transports.status.enabled = false`, but Task 1 removed `transports.status` from defaults. If `config.transports.status` is now undefined, setting `.enabled` on undefined throws.

- [ ] **Step 2: Replace status disabling with api disabling**

In `reference/typescript/test/cli-runtime-e2e.test.js`, replace each occurrence of:

```javascript
  config.transports.status.enabled = false;
```

with:

```javascript
  config.transports.api.enabled = false;
```

- [ ] **Step 3: Run e2e tests**

Run: `cd reference/typescript && node --test test/cli-runtime-e2e.test.js`

Expected: PASS.

- [ ] **Step 4: Commit and push**

```bash
git add reference/typescript/test/cli-runtime-e2e.test.js
git commit -m "test: disable api transport in CLI runtime e2e configs"
git push origin master
```

---

## Task 5: Final verification

- [ ] **Step 1: Run full TypeScript suite**

Run: `cd reference/typescript && npm test`

Expected: all tests pass.

- [ ] **Step 2: Verify git sync**

Run: `git status -sb`

Expected: `## master...origin/master` with no changed files.

- [ ] **Step 3: Push if any commits remain**

```bash
git push origin master
```

Expected: branch up to date.
