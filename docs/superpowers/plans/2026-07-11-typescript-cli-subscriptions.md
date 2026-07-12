# TypeScript CLI Subscriptions Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `aep subscriptions` command group (create/list/delete/stream) to the TypeScript CLI that calls the runtime HTTP subscriptions API.

**Architecture:** A new `src/cli/commands/subscriptions.js` exports a `subscriptionsCommand(subcommand, arg, options)` dispatcher using `fetch` for create/list/delete and a streamed reader for stream. `src/cli/aep.js` wires a `subscriptions` command with a subcommand argument and an optional id argument.

**Tech Stack:** Node.js >=20 ESM, commander, `fetch`, `node:test`.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-cli-subscriptions-design.md`

---

## File Structure

- Create `reference/typescript/src/cli/commands/subscriptions.js`.
- Modify `reference/typescript/src/cli/aep.js`: wire the `subscriptions` command.
- Modify `reference/typescript/test/cli.test.js`: add subscriptions CLI tests.

---

## Task 1: subscriptions create/list/delete

**Files:**
- Create: `reference/typescript/src/cli/commands/subscriptions.js`
- Modify: `reference/typescript/src/cli/aep.js`
- Test: `reference/typescript/test/cli.test.js`

- [ ] **Step 1: Write failing tests**

Append to `reference/typescript/test/cli.test.js`:

```javascript
import { AepRuntimeService } from "../src/runtime/service.js";

function subApiConfig(port) {
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.enabled = false;
  config.transports.sse.enabled = false;
  config.transports.api = { enabled: true, host: "127.0.0.1", port, path: "/aep/api" };
  return config;
}

test("aep subscriptions create/list/delete round-trip", async () => {
  const service = new AepRuntimeService(subApiConfig(18901));
  await service.start();
  const base = "http://127.0.0.1:18901/aep/api";
  try {
    const created = await run(["subscriptions", "create", "--filter", "{\"types\":\"task.*\"}", "--base", base]);
    assert.equal(created.code, 0, created.stderr);
    const record = JSON.parse(created.stdout);
    assert.match(record.id, /^sub_/);

    const listed = await run(["subscriptions", "list", "--base", base]);
    assert.equal(listed.code, 0, listed.stderr);
    assert.match(listed.stdout, new RegExp(record.id));

    const deleted = await run(["subscriptions", "delete", record.id, "--base", base]);
    assert.equal(deleted.code, 0, deleted.stderr);
    assert.match(deleted.stdout, /"deleted":true/);

    const missing = await run(["subscriptions", "delete", record.id, "--base", base]);
    assert.equal(missing.code, 1);
  } finally {
    await service.stop();
  }
});

test("aep subscriptions create rejects invalid filter JSON", async () => {
  const result = await run(["subscriptions", "create", "--filter", "{"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /invalid JSON filter/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/typescript && node --test test/cli.test.js`
Expected: FAIL because the `subscriptions` command is unknown / invalid filter path missing.

- [ ] **Step 3: Implement the subscriptions command**

Create `reference/typescript/src/cli/commands/subscriptions.js`:

```javascript
export async function subscriptionsCommand(subcommand, arg, options = {}) {
  const base = options.base ?? "http://127.0.0.1:8790/aep/api";
  switch (subcommand) {
    case "create": return createSubscription(base, options.filter ?? "{}");
    case "list": return listSubscriptions(base);
    case "delete": return deleteSubscription(base, arg);
    case "stream": return streamSubscription(base, arg);
    default: throw new Error(`unknown subscriptions command: ${subcommand}`);
  }
}

async function createSubscription(base, filterText) {
  let filter;
  try { filter = JSON.parse(filterText); } catch { throw new Error("invalid JSON filter"); }
  const res = await fetchOrThrow(`${base}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter })
  });
  console.log(await res.text());
}

async function listSubscriptions(base) {
  const res = await fetchOrThrow(`${base}/subscriptions`);
  console.log(await res.text());
}

async function deleteSubscription(base, id) {
  if (!id) throw new Error("delete requires a subscription id");
  let res;
  try {
    res = await fetch(`${base}/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    throw new Error(`request failed: ${err.message}. Is aepd running?`);
  }
  if (res.status === 404) throw new Error("not found");
  if (!res.ok) throw new Error(`request failed: HTTP ${res.status}`);
  console.log(await res.text());
}

async function streamSubscription(base, id) {
  if (!id) throw new Error("stream requires a subscription id");
  let res;
  try {
    res = await fetch(`${base}/subscriptions/${encodeURIComponent(id)}/stream`, {
      headers: { Accept: "text/event-stream" }
    });
  } catch (err) {
    throw new Error(`request failed: ${err.message}. Is aepd running?`);
  }
  if (res.status === 404) throw new Error("not found");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith("data: ")) console.log(line.slice("data: ".length));
    }
  }
}

async function fetchOrThrow(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new Error(`request failed: ${err.message}. Is aepd running?`);
  }
  if (!res.ok) throw new Error(`request failed: HTTP ${res.status}`);
  return res;
}
```

- [ ] **Step 4: Wire the command in the CLI**

In `reference/typescript/src/cli/aep.js`, add the import:

```javascript
import { subscriptionsCommand } from "./commands/subscriptions.js";
```

Add the command before `program.parseAsync(process.argv);`:

```javascript
program.command("subscriptions")
  .description("Manage runtime subscriptions over HTTP")
  .argument("<subcommand>", "create | list | delete | stream")
  .argument("[id]", "subscription id for delete/stream")
  .option("--filter <json>", "subscription filter JSON", "{}")
  .option("--base <url>", "runtime API base URL", "http://127.0.0.1:8790/aep/api")
  .action((subcommand, id, options) => run(() => subscriptionsCommand(subcommand, id, options)));
```

- [ ] **Step 5: Run CLI tests**

Run: `cd reference/typescript && node --test test/cli.test.js`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add reference/typescript/src/cli/commands/subscriptions.js reference/typescript/src/cli/aep.js reference/typescript/test/cli.test.js
git commit -m "feat(ts): add aep subscriptions create/list/delete CLI commands"
git push origin master
```

---

## Task 2: subscriptions stream

**Files:**
- Test: `reference/typescript/test/cli.test.js`

The `stream` subcommand is already implemented in Task 1. This task adds an end-to-end stream test.

- [ ] **Step 1: Write the stream test**

Append to `reference/typescript/test/cli.test.js`:

```javascript
test("aep subscriptions stream receives a published event", async () => {
  const service = new AepRuntimeService(subApiConfig(18902));
  await service.start();
  const base = "http://127.0.0.1:18902/aep/api";
  const created = await run(["subscriptions", "create", "--filter", "{\"types\":\"task.*\"}", "--base", base]);
  const record = JSON.parse(created.stdout);

  const child = spawn(process.execPath, [cli, "subscriptions", "stream", record.id, "--base", base], { cwd: path.resolve(".") });
  let stdout = "";
  const gotEvent = new Promise((resolve) => {
    child.stdout.on("data", (d) => {
      stdout += d;
      if (stdout.includes("evt_stream")) resolve();
    });
  });
  try {
    await new Promise((r) => setTimeout(r, 300));
    service.publish({ aep_version: "0.1", id: "evt_stream", type: "task.submitted", source: "t", created_at: new Date().toISOString(), payload: {} });
    await Promise.race([gotEvent, new Promise((_, rej) => setTimeout(() => rej(new Error("timed out")), 3000))]);
    assert.match(stdout, /evt_stream/);
  } finally {
    child.kill("SIGINT");
    await service.stop();
  }
});
```

- [ ] **Step 2: Run the stream test**

Run: `cd reference/typescript && node --test test/cli.test.js`
Expected: PASS. The runtime SSE endpoint flushes an initial comment so the CLI reader establishes the stream before the event is published.

- [ ] **Step 3: Commit and push**

```bash
git add reference/typescript/test/cli.test.js
git commit -m "test(ts): cover aep subscriptions stream end-to-end"
git push origin master
```

---

## Task 3: Final verification

- [ ] **Step 1: Run full TypeScript suite**

Run: `cd reference/typescript && npm test`
Expected: all tests pass.

- [ ] **Step 2: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
