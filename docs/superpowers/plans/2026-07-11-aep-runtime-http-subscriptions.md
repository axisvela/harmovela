# AEP Runtime HTTP Subscriptions And Push Implementation Plan (Subproject B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add HTTP subscription CRUD and event push (SSE + long-poll) to the runtime api transport, with subscription definitions persisted in all three TypeScript delivery stores.

**Architecture:** Each store gains subscription CRUD. `AepRuntimeService` gains a subscription registry that loads persisted subscriptions, buffers matching events in memory, and exposes long-poll drain and SSE attach. The api server adds subscription routes. Async store calls are awaited so PostgreSQL works alongside sync stores.

**Tech Stack:** Node.js >=20 ESM, `node:http`, `fetch`, `node:test`, existing runtime and store modules.

**Design reference:** `docs/superpowers/specs/2026-07-11-aep-runtime-http-subscriptions-design.md`

---

## File Structure

- Modify `implementations/typescript/src/delivery-store-memory.js`: subscription CRUD via Map.
- Modify `implementations/typescript/src/delivery-store-sqlite.js`: `delivery_subscriptions` table + CRUD.
- Modify `implementations/typescript/src/delivery-store-postgres.js`: `<prefix>_subscriptions` table + CRUD.
- Modify `implementations/typescript/src/runtime/service.js`: subscription registry, buffers, matching on publish, load on start.
- Modify `implementations/typescript/src/runtime/api-server.js`: subscription routes and SSE/long-poll.
- Modify tests: `test/delivery-store.test.js`, `test/delivery-store-sqlite.test.js`, `test/delivery-store-postgres.test.js`, `test/runtime-service.test.js`.

---

## Task 1: In-memory store subscription CRUD

**Files:**
- Modify: `implementations/typescript/src/delivery-store-memory.js`
- Test: `implementations/typescript/test/delivery-store.test.js`

- [ ] **Step 1: Write failing test**

Append to `implementations/typescript/test/delivery-store.test.js`:

```javascript
test("InMemoryDeliveryStore persists subscriptions", () => {
  const store = new InMemoryDeliveryStore();
  const record = store.createSubscription({ id: "sub_1", filter: { types: "task.*" }, created_at: "2026-07-11T10:00:00Z" });
  assert.equal(record.id, "sub_1");
  assert.equal(store.getSubscription("sub_1").filter.types, "task.*");
  assert.equal(store.listSubscriptions().length, 1);
  assert.equal(store.deleteSubscription("sub_1"), true);
  assert.equal(store.getSubscription("sub_1"), null);
  assert.equal(store.deleteSubscription("sub_1"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/typescript && node --test test/delivery-store.test.js`

Expected: FAIL because `createSubscription` is not a function.

- [ ] **Step 3: Implement subscription CRUD**

In `implementations/typescript/src/delivery-store-memory.js`, add to the constructor after `this._deadLettered = new Map();`:

```javascript
    this._subscriptions = new Map();
```

Add methods to the class before `getStats()`:

```javascript
  createSubscription(record) {
    this._subscriptions.set(record.id, record);
    return record;
  }

  getSubscription(id) {
    return this._subscriptions.get(id) ?? null;
  }

  listSubscriptions() {
    return [...this._subscriptions.values()];
  }

  deleteSubscription(id) {
    return this._subscriptions.delete(id);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd implementations/typescript && node --test test/delivery-store.test.js`

Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/typescript/src/delivery-store-memory.js implementations/typescript/test/delivery-store.test.js
git commit -m "feat: add in-memory delivery store subscription CRUD"
git push origin master
```

---

## Task 2: SQLite store subscription CRUD

**Files:**
- Modify: `implementations/typescript/src/delivery-store-sqlite.js`
- Test: `implementations/typescript/test/delivery-store-sqlite.test.js`

- [ ] **Step 1: Write failing test**

Append to `implementations/typescript/test/delivery-store-sqlite.test.js`:

```javascript
test("SqliteDeliveryStore persists subscriptions", () => {
  const store = new SqliteDeliveryStore(":memory:");
  store.createSubscription({ id: "sub_1", filter: { types: "task.*" }, created_at: "2026-07-11T10:00:00Z" });
  assert.equal(store.getSubscription("sub_1").filter.types, "task.*");
  assert.equal(store.listSubscriptions().length, 1);
  assert.equal(store.deleteSubscription("sub_1"), true);
  assert.equal(store.getSubscription("sub_1"), null);
  assert.equal(store.deleteSubscription("sub_1"), false);
  store.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/typescript && node --test test/delivery-store-sqlite.test.js`

Expected: FAIL because `createSubscription` is not a function.

- [ ] **Step 3: Add subscriptions table**

In `implementations/typescript/src/delivery-store-sqlite.js` `_initSchema()`, add before the closing backtick of the `exec` template:

```javascript
      CREATE TABLE IF NOT EXISTS delivery_subscriptions (
        id TEXT PRIMARY KEY,
        filter TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
```

- [ ] **Step 4: Implement subscription CRUD**

Add methods to the class before `close()`:

```javascript
  createSubscription(record) {
    this._db.prepare("INSERT OR REPLACE INTO delivery_subscriptions (id, filter, created_at) VALUES (?,?,?)")
      .run(record.id, JSON.stringify(record.filter ?? {}), record.created_at);
    return record;
  }

  getSubscription(id) {
    const row = this._db.prepare("SELECT * FROM delivery_subscriptions WHERE id = ?").get(id);
    return row ? rowToSubscription(row) : null;
  }

  listSubscriptions() {
    return this._db.prepare("SELECT * FROM delivery_subscriptions ORDER BY created_at").all().map(rowToSubscription);
  }

  deleteSubscription(id) {
    const result = this._db.prepare("DELETE FROM delivery_subscriptions WHERE id = ?").run(id);
    return result.changes > 0;
  }
```

Add a helper at the bottom of the file, after `rowToPending`:

```javascript
function rowToSubscription(row) {
  return {
    id: row.id,
    filter: JSON.parse(row.filter),
    created_at: row.created_at
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd implementations/typescript && node --test test/delivery-store-sqlite.test.js`

Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add implementations/typescript/src/delivery-store-sqlite.js implementations/typescript/test/delivery-store-sqlite.test.js
git commit -m "feat: add SQLite delivery store subscription CRUD"
git push origin master
```

---

## Task 3: PostgreSQL store subscription CRUD

**Files:**
- Modify: `implementations/typescript/src/delivery-store-postgres.js`
- Test: `implementations/typescript/test/delivery-store-postgres.test.js`

- [ ] **Step 1: Write failing test**

Append to `implementations/typescript/test/delivery-store-postgres.test.js`:

```javascript
test("PostgresDeliveryStore persists subscriptions", async () => {
  const store = await newStore();
  await store.createSubscription({ id: "sub_1", filter: { types: "task.*" }, created_at: "2026-07-11T10:00:00Z" });
  const got = await store.getSubscription("sub_1");
  assert.equal(got.filter.types, "task.*");
  const list = await store.listSubscriptions();
  assert.equal(list.length, 1);
  assert.equal(await store.deleteSubscription("sub_1"), true);
  assert.equal(await store.getSubscription("sub_1"), null);
  assert.equal(await store.deleteSubscription("sub_1"), false);
  await store.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/typescript && node --test test/delivery-store-postgres.test.js`

Expected: FAIL because `createSubscription` is not a function.

- [ ] **Step 3: Add subscriptions table to schema**

In `implementations/typescript/src/delivery-store-postgres.js` `init()`, add inside the `CREATE TABLE` query block before the closing backtick:

```javascript
      CREATE TABLE IF NOT EXISTS ${this._t("subscriptions")} (
        id TEXT PRIMARY KEY,
        filter JSONB NOT NULL,
        created_at TEXT NOT NULL
      );
```

- [ ] **Step 4: Implement subscription CRUD**

Add methods to the class before `close()`:

```javascript
  async createSubscription(record) {
    await this._client.query(
      `INSERT INTO ${this._t("subscriptions")} (id, filter, created_at) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET filter=EXCLUDED.filter, created_at=EXCLUDED.created_at`,
      [record.id, JSON.stringify(record.filter ?? {}), record.created_at]
    );
    return record;
  }

  async getSubscription(id) {
    const res = await this._client.query(
      `SELECT id, filter, created_at FROM ${this._t("subscriptions")} WHERE id = $1`, [id]);
    if (res.rowCount === 0) return null;
    return rowToSubscription(res.rows[0]);
  }

  async listSubscriptions() {
    const res = await this._client.query(
      `SELECT id, filter, created_at FROM ${this._t("subscriptions")} ORDER BY created_at`);
    return res.rows.map(rowToSubscription);
  }

  async deleteSubscription(id) {
    const res = await this._client.query(
      `DELETE FROM ${this._t("subscriptions")} WHERE id = $1`, [id]);
    return res.rowCount > 0;
  }
```

Add a helper at the bottom of the file, after `rowToDeadLettered`:

```javascript
function rowToSubscription(row) {
  return {
    id: row.id,
    filter: typeof row.filter === "string" ? JSON.parse(row.filter) : row.filter,
    created_at: row.created_at
  };
}
```

Also update the `close()` `dropOnClose` DROP TABLE list to include subscriptions. Change:

```javascript
        `DROP TABLE IF EXISTS ${this._t("meta")}, ${this._t("pending")}, ` +
        `${this._t("acked")}, ${this._t("dead_lettered")}`);
```

to:

```javascript
        `DROP TABLE IF EXISTS ${this._t("meta")}, ${this._t("pending")}, ` +
        `${this._t("acked")}, ${this._t("dead_lettered")}, ${this._t("subscriptions")}`);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd implementations/typescript && node --test test/delivery-store-postgres.test.js`

Expected: PASS against live PostgreSQL at `localhost:5433`.

- [ ] **Step 6: Commit and push**

```bash
git add implementations/typescript/src/delivery-store-postgres.js implementations/typescript/test/delivery-store-postgres.test.js
git commit -m "feat: add PostgreSQL delivery store subscription CRUD"
git push origin master
```

---

## Task 4: Runtime subscription registry

**Files:**
- Modify: `implementations/typescript/src/runtime/service.js`
- Test: `implementations/typescript/test/runtime-service.test.js`

- [ ] **Step 1: Write failing test**

Append to `implementations/typescript/test/runtime-service.test.js`:

```javascript
test("service registry buffers matching events and drains them", async () => {
  const config = apiConfig();
  const service = new AepRuntimeService(config);
  await service.start();
  const record = await service.createSubscription({ types: "task.*" });
  service.publish(event({ id: "evt_match", type: "task.submitted" }));
  service.publish(event({ id: "evt_skip", type: "session.opened" }));
  const drained = service.takeEvents(record.id, 100);
  assert.equal(drained.length, 1);
  assert.equal(drained[0].id, "evt_match");
  assert.equal(service.takeEvents(record.id, 100).length, 0);
  await service.stop();
});

test("service loads persisted subscriptions on start", async () => {
  const config = apiConfig();
  const service = new AepRuntimeService(config);
  await service.start();
  await service.createSubscription({ types: "task.*" });
  const list = service.listSubscriptions();
  assert.equal(list.length, 1);
  await service.stop();
});
```

Note: `session.opened` is a standard event type in the registry, so it validates but does not match `task.*`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/typescript && node --test test/runtime-service.test.js`

Expected: FAIL because `service.createSubscription` is not a function.

- [ ] **Step 3: Implement registry in the service**

In `implementations/typescript/src/runtime/service.js`, add to the constructor after `this.transports = {};`:

```javascript
    this.subscriptions = new Map();
    this.maxBuffer = 1000;
```

Add a randomId import at the top:

```javascript
import { randomUUID } from "node:crypto";
```

In `start()`, after the api branch and before `this.started = true;`, load persisted subscriptions:

```javascript
    const persisted = await this.store.listSubscriptions?.() ?? [];
    for (const record of persisted) {
      this.subscriptions.set(record.id, { record, buffer: [], sinks: new Set() });
    }
```

In `publish(event)`, after `this.router.dispatch(event);`, add matching fanout:

```javascript
    for (const entry of this.subscriptions.values()) {
      if (subscriptionMatches({ payload: entry.record.filter }, event)) {
        entry.buffer.push(event);
        if (entry.buffer.length > this.maxBuffer) entry.buffer.shift();
        for (const sink of entry.sinks) sink(event);
      }
    }
```

Add the subscription import at the top:

```javascript
import { subscriptionMatches } from "../subscription.js";
```

Add registry methods to the class after `getDeadLettered()`:

```javascript
  async createSubscription(filter) {
    const record = { id: `sub_${randomUUID()}`, filter: filter ?? {}, created_at: new Date().toISOString() };
    await this.store.createSubscription?.(record);
    this.subscriptions.set(record.id, { record, buffer: [], sinks: new Set() });
    return record;
  }

  listSubscriptions() {
    return [...this.subscriptions.values()].map((e) => e.record);
  }

  getSubscription(id) {
    return this.subscriptions.get(id)?.record ?? null;
  }

  async deleteSubscription(id) {
    const existed = this.subscriptions.delete(id);
    await this.store.deleteSubscription?.(id);
    return existed;
  }

  takeEvents(id, max) {
    const entry = this.subscriptions.get(id);
    if (!entry) return [];
    return entry.buffer.splice(0, max);
  }

  attachStream(id, sink) {
    const entry = this.subscriptions.get(id);
    if (!entry) return null;
    entry.sinks.add(sink);
    return () => entry.sinks.delete(sink);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd implementations/typescript && node --test test/runtime-service.test.js`

Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/typescript/src/runtime/service.js implementations/typescript/test/runtime-service.test.js
git commit -m "feat: add runtime subscription registry with buffered fanout"
git push origin master
```

---

## Task 5: Subscription CRUD endpoints

**Files:**
- Modify: `implementations/typescript/src/runtime/api-server.js`
- Test: `implementations/typescript/test/runtime-service.test.js`

- [ ] **Step 1: Write failing tests**

Append to `implementations/typescript/test/runtime-service.test.js`:

```javascript
test("api creates, lists, gets, and deletes subscriptions", async () => {
  const { service, base } = await startApiService(apiConfig());
  const createRes = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { types: "task.*" } })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.match(created.id, /^sub_/);

  const listRes = await fetch(`${base}/subscriptions`);
  const list = await listRes.json();
  assert.equal(list.subscriptions.length, 1);

  const getRes = await fetch(`${base}/subscriptions/${created.id}`);
  assert.equal(getRes.status, 200);

  const delRes = await fetch(`${base}/subscriptions/${created.id}`, { method: "DELETE" });
  assert.equal(delRes.status, 200);
  const delBody = await delRes.json();
  assert.equal(delBody.deleted, true);

  const missingRes = await fetch(`${base}/subscriptions/${created.id}`);
  assert.equal(missingRes.status, 404);
  await service.stop();
});

test("api long-poll returns buffered matching events", async () => {
  const { service, base } = await startApiService(apiConfig());
  const createRes = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { types: "task.*" } })
  });
  const { id } = await createRes.json();
  service.publish(event({ id: "evt_lp", type: "task.submitted" }));
  const eventsRes = await fetch(`${base}/subscriptions/${id}/events`);
  assert.equal(eventsRes.status, 200);
  const body = await eventsRes.json();
  assert.equal(body.events.length, 1);
  assert.equal(body.events[0].id, "evt_lp");
  await service.stop();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/typescript && node --test test/runtime-service.test.js`

Expected: FAIL because subscription routes return 404.

- [ ] **Step 3: Implement subscription CRUD and long-poll routes**

In `implementations/typescript/src/runtime/api-server.js`, inside `handle()` before the final `return sendJson(res, 404, ...)`, add:

```javascript
  if (route === "/subscriptions" && req.method === "POST") {
    return handleCreateSubscription(service, req, res);
  }

  if (route === "/subscriptions" && req.method === "GET") {
    return sendJson(res, 200, { subscriptions: service.listSubscriptions() });
  }

  const subMatch = route && route.match(/^\/subscriptions\/([^/]+)(\/events|\/stream)?$/);
  if (subMatch) {
    const id = decodeURIComponent(subMatch[1]);
    const suffix = subMatch[2];
    if (!suffix && req.method === "GET") {
      const record = service.getSubscription(id);
      return record ? sendJson(res, 200, record) : sendJson(res, 404, { error: "not found" });
    }
    if (!suffix && req.method === "DELETE") {
      const deleted = await service.deleteSubscription(id);
      return deleted ? sendJson(res, 200, { deleted: true }) : sendJson(res, 404, { error: "not found" });
    }
    if (suffix === "/events" && req.method === "GET") {
      return handleLongPoll(service, id, res);
    }
    if (suffix === "/stream" && req.method === "GET") {
      return handleStream(service, id, req, res);
    }
  }
```

Add handler functions at the bottom of the file before `sendJson`:

```javascript
async function handleCreateSubscription(service, req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  let body;
  try {
    body = raw.length > 0 ? JSON.parse(raw) : {};
  } catch {
    return sendJson(res, 400, { error: "invalid JSON body" });
  }
  const filter = body.filter ?? body;
  const record = await service.createSubscription(filter);
  return sendJson(res, 201, record);
}

function handleLongPoll(service, id, res) {
  if (!service.getSubscription(id)) return sendJson(res, 404, { error: "not found" });
  const events = service.takeEvents(id, 100);
  return sendJson(res, 200, { events });
}

function handleStream(service, id, req, res) {
  if (!service.getSubscription(id)) return sendJson(res, 404, { error: "not found" });
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  const buffered = service.takeEvents(id, 1000);
  for (const evt of buffered) res.write(`data: ${JSON.stringify(evt)}\n\n`);
  const detach = service.attachStream(id, (evt) => {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  });
  req.on("close", () => { if (detach) detach(); });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd implementations/typescript && node --test test/runtime-service.test.js`

Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/typescript/src/runtime/api-server.js implementations/typescript/test/runtime-service.test.js
git commit -m "feat: add api subscription CRUD and long-poll endpoints"
git push origin master
```

---

## Task 6: SSE stream endpoint test

**Files:**
- Test: `implementations/typescript/test/runtime-service.test.js`

- [ ] **Step 1: Write failing SSE stream test**

Append to `implementations/typescript/test/runtime-service.test.js`:

```javascript
test("api SSE stream receives matching events", async () => {
  const { service, base } = await startApiService(apiConfig());
  const createRes = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { types: "task.*" } })
  });
  const { id } = await createRes.json();

  const controller = new AbortController();
  const streamRes = await fetch(`${base}/subscriptions/${id}/stream`, {
    headers: { Accept: "text/event-stream" },
    signal: controller.signal
  });
  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();

  service.publish(event({ id: "evt_sse", type: "task.submitted" }));

  let received = "";
  while (!received.includes("evt_sse")) {
    const { value, done } = await reader.read();
    if (done) break;
    received += decoder.decode(value, { stream: true });
  }
  assert.match(received, /evt_sse/);
  controller.abort();
  await service.stop();
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd implementations/typescript && node --test test/runtime-service.test.js`

Expected: PASS because Task 5 implemented the stream route. This test locks in SSE behavior.

- [ ] **Step 3: Commit and push**

```bash
git add implementations/typescript/test/runtime-service.test.js
git commit -m "test: cover api SSE subscription stream"
git push origin master
```

---

## Task 7: Final verification

- [ ] **Step 1: Run full TypeScript suite**

Run: `cd implementations/typescript && npm test`

Expected: all tests pass.

- [ ] **Step 2: Verify git sync**

Run: `git status -sb`

Expected: `## master...origin/master` with no changed files.

- [ ] **Step 3: Push if any commits remain**

```bash
git push origin master
```

Expected: branch up to date.
