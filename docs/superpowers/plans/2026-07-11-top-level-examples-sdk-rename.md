# Top-Level Examples And SDK Package Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the TypeScript reference package to `@axisrobo/aep`, add a top-level npm workspace, and create a top-level `examples/` directory with SDK-embed and service-client examples.

**Architecture:** A root `package.json` declares a workspace over `implementations/typescript`, so `@axisrobo/aep` resolves locally without publishing. Top-level `examples/sdk/` imports the package by name; `examples/service/` connects to a running `aepd` over WebSocket and HTTP API. A smoke test spawns one example of each kind.

**Tech Stack:** Node.js >=20 ESM, npm workspaces, `node:test`, `ws`, `fetch`, existing runtime modules.

**Design reference:** `docs/superpowers/specs/2026-07-11-top-level-examples-sdk-rename-design.md`

---

## File Structure

- Modify `implementations/typescript/package.json`: rename to `@axisrobo/aep`, drop moved demo scripts.
- Modify `implementations/typescript/package-lock.json`: update name fields.
- Create `package.json` (root): workspace config.
- Modify `.gitignore`: ignore root `node_modules`.
- Create `examples/README.md`.
- Create `examples/sdk/runtime-embed.js`.
- Create `examples/sdk/agent-subscriber.js` (migrated).
- Create `examples/sdk/memory-event-producer.js` (migrated).
- Create `examples/service/emit-and-subscribe.js`.
- Create `examples/service/http-api-client.js`.
- Delete migrated files under `implementations/typescript/examples/`.
- Create `implementations/typescript/test/examples-smoke.test.js`.

---

## Task 1: Rename package and add workspace

**Files:**
- Modify: `implementations/typescript/package.json`
- Modify: `implementations/typescript/package-lock.json`
- Create: `package.json` (root)
- Modify: `.gitignore`

- [ ] **Step 1: Rename the reference package**

In `implementations/typescript/package.json`, change line 2:

```json
  "name": "@axisrobo/aep",
```

- [ ] **Step 2: Update lockfile name fields**

In `implementations/typescript/package-lock.json`, change the top-level `"name"` (line 2) and the root package `"name"` (line 8) from `@axisrobo/aep-reference-typescript` to `@axisrobo/aep`.

- [ ] **Step 3: Create root workspace package.json**

Create `package.json` at repo root:

```json
{
  "name": "aep-workspace",
  "private": true,
  "workspaces": ["implementations/typescript"],
  "scripts": {
    "test": "npm test --workspace @axisrobo/aep",
    "example:sdk": "node examples/sdk/runtime-embed.js"
  }
}
```

- [ ] **Step 4: Ignore root node_modules**

Check `.gitignore` includes `node_modules`. If it does not include a root-level `node_modules` rule, add this line:

```
/node_modules/
```

- [ ] **Step 5: Install workspace links**

Run: `npm install`
Expected: creates root `node_modules` with `@axisrobo/aep` linked to `implementations/typescript`.

- [ ] **Step 6: Verify package resolves and tests pass**

Run: `node -e "import('@axisrobo/aep').then(m => console.log(typeof m.AepRuntimeService))"`
Expected: prints `function`.

Run: `npm test --workspace @axisrobo/aep`
Expected: full TypeScript suite passes.

- [ ] **Step 7: Commit and push**

```bash
git add package.json package-lock.json implementations/typescript/package.json implementations/typescript/package-lock.json .gitignore
git commit -m "feat: rename reference package to @axisrobo/aep and add npm workspace"
git push origin master
```

---

## Task 2: Create SDK runtime-embed example

**Files:**
- Create: `examples/sdk/runtime-embed.js`
- Create: `examples/README.md`
- Test: `implementations/typescript/test/examples-smoke.test.js`

- [ ] **Step 1: Write failing smoke test**

Create `implementations/typescript/test/examples-smoke.test.js`:

```javascript
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve("..", "..");

function runNode(scriptRelPath, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(repoRoot, scriptRelPath), ...args], { cwd: repoRoot });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("sdk runtime-embed example publishes and receives an event", async () => {
  const result = await runNode("examples/sdk/runtime-embed.js");
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /received task.submitted evt_embed/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/typescript && node --test test/examples-smoke.test.js`
Expected: FAIL because `examples/sdk/runtime-embed.js` does not exist.

- [ ] **Step 3: Implement runtime-embed example**

Create `examples/sdk/runtime-embed.js`:

```javascript
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
  aep_version: "0.1",
  id: "evt_embed",
  type: "task.submitted",
  source: "example:sdk",
  created_at: new Date().toISOString(),
  payload: { task_id: "task_01" }
});
await service.stop();
```

- [ ] **Step 4: Create examples README**

Create `examples/README.md`:

```markdown
# AEP Examples

Two categories of examples.

## SDK examples (`examples/sdk/`)

Embed AEP in-process by importing `@axisrobo/aep`. Run from the repo root after `npm install`:

```bash
node examples/sdk/runtime-embed.js
node examples/sdk/agent-subscriber.js
node examples/sdk/memory-event-producer.js
```

## Service examples (`examples/service/`)

Connect to a running `aepd` daemon. Start it first:

```bash
npm run aep --workspace @axisrobo/aep -- init --config aep.config.json
npm run aepd --workspace @axisrobo/aep
```

Then run a client:

```bash
node examples/service/emit-and-subscribe.js
node examples/service/http-api-client.js
```

Requires `npm install` at the repo root so the `@axisrobo/aep` workspace link exists.
```

- [ ] **Step 5: Run smoke test**

Run: `cd implementations/typescript && node --test test/examples-smoke.test.js`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add examples/sdk/runtime-embed.js examples/README.md implementations/typescript/test/examples-smoke.test.js
git commit -m "feat: add SDK runtime-embed example and examples README"
git push origin master
```

---

## Task 3: Migrate SDK examples from reference

**Files:**
- Create: `examples/sdk/agent-subscriber.js`
- Create: `examples/sdk/memory-event-producer.js`
- Delete: `implementations/typescript/examples/agent-subscriber.js`
- Delete: `implementations/typescript/examples/memory-event-producer.js`
- Modify: `implementations/typescript/package.json`

- [ ] **Step 1: Create migrated agent-subscriber example**

Create `examples/sdk/agent-subscriber.js` as a copy of `implementations/typescript/examples/agent-subscriber.js` with the import line changed from:

```javascript
import { AepHarness, MockStdioTransport, AepSession } from "../src/index.js";
```

to:

```javascript
import { AepHarness, MockStdioTransport, AepSession } from "@axisrobo/aep";
```

Keep the rest of the file identical.

- [ ] **Step 2: Create migrated memory-event-producer example**

Create `examples/sdk/memory-event-producer.js` as a copy of `implementations/typescript/examples/memory-event-producer.js` with the import line changed from:

```javascript
import { AepHarness, MockStdioTransport, AepSession, subscriptionMatches } from "../src/index.js";
```

to:

```javascript
import { AepHarness, MockStdioTransport, AepSession, subscriptionMatches } from "@axisrobo/aep";
```

Keep the rest of the file identical.

- [ ] **Step 3: Delete the original reference copies**

Delete `implementations/typescript/examples/agent-subscriber.js` and `implementations/typescript/examples/memory-event-producer.js`.

- [ ] **Step 4: Update reference package scripts**

In `implementations/typescript/package.json`, remove the two scripts that point at the deleted files:

```json
    "demo:memory": "node ./examples/memory-event-producer.js",
    "demo:agent": "node ./examples/agent-subscriber.js",
```

- [ ] **Step 5: Run migrated examples**

Run: `node examples/sdk/agent-subscriber.js`
Expected: exits 0 and prints the agent subscriber demo output.

Run: `node examples/sdk/memory-event-producer.js`
Expected: exits 0 and prints the memory event demo output.

- [ ] **Step 6: Run full workspace test suite**

Run: `npm test --workspace @axisrobo/aep`
Expected: all tests pass.

- [ ] **Step 7: Commit and push**

```bash
git add examples/sdk/agent-subscriber.js examples/sdk/memory-event-producer.js implementations/typescript/package.json
git rm implementations/typescript/examples/agent-subscriber.js implementations/typescript/examples/memory-event-producer.js
git commit -m "feat: migrate SDK examples to top-level examples/sdk"
git push origin master
```

---

## Task 4: Service examples and service smoke test

**Files:**
- Create: `examples/service/emit-and-subscribe.js`
- Create: `examples/service/http-api-client.js`
- Test: `implementations/typescript/test/examples-smoke.test.js`

- [ ] **Step 1: Write failing service smoke test**

Append to `implementations/typescript/test/examples-smoke.test.js`:

```javascript
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { defaultConfig } from "../src/runtime/config.js";

test("service http-api-client example round-trips through aepd", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aep-ex-"));
  const configPath = path.join(dir, "aep.config.json");
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.enabled = false;
  config.transports.sse.enabled = false;
  config.transports.api = { enabled: true, host: "127.0.0.1", port: 8795, path: "/aep/api" };
  await writeFile(configPath, JSON.stringify(config), "utf8");

  const aepd = path.join(repoRoot, "reference", "typescript", "src", "runtime", "server.js");
  const daemon = spawn(process.execPath, [aepd], { cwd: repoRoot, env: { ...process.env, AEP_CONFIG: configPath } });
  try {
    await waitFor(daemon.stdout, /aepd started/);
    const result = await runNode("examples/service/http-api-client.js", ["--base", "http://127.0.0.1:8795/aep/api"]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /received evt_http/);
  } finally {
    daemon.kill("SIGINT");
    await rm(dir, { recursive: true, force: true });
  }
});

function waitFor(stream, pattern) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${pattern}`)), 5000);
    stream.on("data", (chunk) => {
      if (pattern.test(chunk.toString())) { clearTimeout(timer); resolve(); }
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/typescript && node --test test/examples-smoke.test.js`
Expected: FAIL because `examples/service/http-api-client.js` does not exist.

- [ ] **Step 3: Implement http-api-client example**

Create `examples/service/http-api-client.js`:

```javascript
#!/usr/bin/env node
function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const base = argValue("--base", "http://127.0.0.1:8790/aep/api");

async function main() {
  const createRes = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { types: "task.*" } })
  });
  const { id } = await createRes.json();

  await fetch(`${base}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      aep_version: "0.1",
      id: "evt_http",
      type: "task.submitted",
      source: "example:service",
      created_at: new Date().toISOString(),
      payload: { task_id: "task_01" }
    })
  });

  const eventsRes = await fetch(`${base}/subscriptions/${id}/events`);
  const body = await eventsRes.json();
  for (const event of body.events) {
    console.log(`received ${event.id}`);
  }
}

main().catch((err) => {
  console.error(`http-api-client: ${err.message}. Is aepd running?`);
  process.exitCode = 1;
});
```

- [ ] **Step 4: Implement emit-and-subscribe example**

Create `examples/service/emit-and-subscribe.js`:

```javascript
#!/usr/bin/env node
import { WebSocket } from "ws";

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const url = argValue("--url", "ws://127.0.0.1:8787/aep");

const subscriber = new WebSocket(url, ["aep-0.1"]);
subscriber.on("message", (data) => {
  const event = JSON.parse(data.toString());
  console.log(`received ${event.type} ${event.id}`);
  subscriber.close();
  process.exit(0);
});
subscriber.on("open", () => {
  const emitter = new WebSocket(url, ["aep-0.1"]);
  emitter.on("open", () => {
    emitter.send(JSON.stringify({
      aep_version: "0.1",
      id: "evt_ws_example",
      type: "task.submitted",
      source: "example:service",
      created_at: new Date().toISOString(),
      payload: { task_id: "task_01" }
    }));
    emitter.close();
  });
});
subscriber.on("error", (err) => {
  console.error(`emit-and-subscribe: ${err.message}. Is aepd running?`);
  process.exitCode = 1;
});
```

- [ ] **Step 5: Run smoke test**

Run: `cd implementations/typescript && node --test test/examples-smoke.test.js`
Expected: PASS for all example smoke tests.

- [ ] **Step 6: Commit and push**

```bash
git add examples/service/emit-and-subscribe.js examples/service/http-api-client.js implementations/typescript/test/examples-smoke.test.js
git commit -m "feat: add service-client examples with smoke coverage"
git push origin master
```

---

## Task 5: Final verification

- [ ] **Step 1: Run full workspace test suite**

Run: `npm test --workspace @axisrobo/aep`
Expected: all tests pass.

- [ ] **Step 2: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.

- [ ] **Step 3: Push if any commits remain**

```bash
git push origin master
```
Expected: branch up to date.
