# AEP Commander CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the TypeScript `aep` CLI from a hand-written dispatcher to a `commander` command tree while preserving existing behavior and adding `aep status`.

**Architecture:** `src/cli/aep.js` owns the commander program and delegates to focused command modules. Existing runtime/config/service modules remain unchanged except for adding a default status transport to generated config. Tests drive command behavior through real CLI subprocesses.

**Tech Stack:** Node.js >=20 ESM, `commander`, `node:test`, existing TypeScript reference modules.

**Design reference:** `docs/superpowers/specs/2026-07-11-aep-commander-cli-design.md`

---

## File Structure

- Modify `reference/typescript/package.json` and `package-lock.json`: add `commander` dependency.
- Modify `reference/typescript/src/runtime/config.js`: include default `transports.status`.
- Modify `reference/typescript/src/cli/aep.js`: commander program setup.
- Modify command modules under `reference/typescript/src/cli/commands/`: accept structured options.
- Create `reference/typescript/src/cli/commands/status.js`: query health endpoint.
- Modify `reference/typescript/test/cli.test.js`: CLI framework/help/status/config tests.

---

## Task 1: Add Commander Dependency And Default Status Config

**Files:**
- Modify: `reference/typescript/package.json`
- Modify: `reference/typescript/package-lock.json`
- Modify: `reference/typescript/src/runtime/config.js`
- Test: `reference/typescript/test/runtime-config.test.js`

- [ ] **Step 1: Write failing config test**

Modify `reference/typescript/test/runtime-config.test.js`, in `defaultConfig returns local sqlite runtime config`, add:

```javascript
  assert.equal(config.transports.status.enabled, true);
  assert.equal(config.transports.status.port, 8789);
  assert.equal(config.transports.status.path, "/healthz");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/typescript && node --test test/runtime-config.test.js`

Expected: FAIL because `config.transports.status` is undefined.

- [ ] **Step 3: Add commander dependency**

Run: `cd reference/typescript && npm install commander`

Expected: `commander` added to `dependencies` in `package.json` and `package-lock.json` updated.

- [ ] **Step 4: Implement default status config**

Modify `reference/typescript/src/runtime/config.js`, inside `transports` returned by `defaultConfig()`:

```javascript
      status: { enabled: true, host: "127.0.0.1", port: 8789, path: "/healthz" }
```

- [ ] **Step 5: Run config tests**

Run: `cd reference/typescript && node --test test/runtime-config.test.js`

Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add reference/typescript/package.json reference/typescript/package-lock.json reference/typescript/src/runtime/config.js reference/typescript/test/runtime-config.test.js
git commit -m "feat: add commander dependency and default AEP status config"
git push origin master
```

---

## Task 2: Commander Program And Help Output

**Files:**
- Modify: `reference/typescript/src/cli/aep.js`
- Test: `reference/typescript/test/cli.test.js`

- [ ] **Step 1: Write failing help test**

Append to `reference/typescript/test/cli.test.js`:

```javascript
test("aep --help lists core commands", async () => {
  const result = await run(["--help"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /init/);
  assert.match(result.stdout, /start/);
  assert.match(result.stdout, /status/);
  assert.match(result.stdout, /emit/);
  assert.match(result.stdout, /subscribe/);
  assert.match(result.stdout, /dlq/);
  assert.match(result.stdout, /conformance/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/typescript && node --test test/cli.test.js`

Expected: FAIL because `status` is not listed and output is not commander help.

- [ ] **Step 3: Refactor CLI entrypoint to commander**

Replace `reference/typescript/src/cli/aep.js` with:

```javascript
#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";
import { emitCommand } from "./commands/emit.js";
import { subscribeCommand } from "./commands/subscribe.js";
import { conformanceCommand } from "./commands/conformance.js";
import { dlqCommand } from "./commands/dlq.js";

const program = new Command();

program
  .name("aep")
  .description("Agent Event Protocol CLI")
  .showHelpAfterError();

program.command("init")
  .description("Create an AEP runtime config file")
  .option("--config <path>", "config file path", "aep.config.json")
  .action((options) => run(() => initCommand(options)));

program.command("start")
  .description("Start the local aepd runtime daemon")
  .option("--config <path>", "config file path", process.env.AEP_CONFIG ?? "aep.config.json")
  .action((options) => run(() => startCommand(options)));

program.command("status")
  .description("Query an aepd health endpoint")
  .option("--url <url>", "health endpoint URL", "http://127.0.0.1:8789/healthz")
  .action(() => run(async () => {
    throw new Error("status command not implemented");
  }));

program.command("emit")
  .description("Emit one AEP event through WebSocket")
  .argument("<type>", "event type")
  .option("--payload <json>", "event payload JSON", "{}")
  .option("--url <url>", "WebSocket URL", "ws://127.0.0.1:8787/aep")
  .option("--id <id>", "event id")
  .option("--source <source>", "event source", "cli:aep")
  .action((type, options) => run(() => emitCommand(type, options)));

program.command("subscribe")
  .description("Subscribe to AEP events through WebSocket")
  .option("--type <pattern>", "event type pattern", "*")
  .option("--url <url>", "WebSocket URL", "ws://127.0.0.1:8787/aep")
  .action((options) => run(() => subscribeCommand(options)));

program.command("dlq")
  .description("Inspect dead-lettered events")
  .argument("[subcommand]", "dlq subcommand", "list")
  .option("--config <path>", "config file path", process.env.AEP_CONFIG ?? "aep.config.json")
  .action((subcommand, options) => run(() => dlqCommand(subcommand, options)));

program.command("conformance")
  .description("Run AEP conformance fixtures")
  .option("--level <level>", "target conformance level")
  .action((options) => run(() => conformanceCommand(options)));

program.parseAsync(process.argv);

async function run(fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`aep: ${err.message}`);
    process.exitCode = 1;
  }
}
```

- [ ] **Step 4: Run CLI tests**

Run: `cd reference/typescript && node --test test/cli.test.js`

Expected: tests may still fail because command modules still expect raw args. Proceed to Task 3.

- [ ] **Step 5: Commit and push only if tests pass**

If tests pass:

```bash
git add reference/typescript/src/cli/aep.js reference/typescript/test/cli.test.js
git commit -m "feat: migrate aep CLI entrypoint to commander"
git push origin master
```

If tests fail due to raw args mismatch, do not commit; continue Task 3 and commit combined CLI refactor there.

---

## Task 3: Convert Existing Command Modules To Structured Options

**Files:**
- Modify: `reference/typescript/src/cli/commands/init.js`
- Modify: `reference/typescript/src/cli/commands/start.js`
- Modify: `reference/typescript/src/cli/commands/emit.js`
- Modify: `reference/typescript/src/cli/commands/subscribe.js`
- Modify: `reference/typescript/src/cli/commands/dlq.js`
- Modify: `reference/typescript/src/cli/commands/conformance.js`
- Test: `reference/typescript/test/cli.test.js`

- [ ] **Step 1: Ensure current CLI tests fail for option mismatch**

Run: `cd reference/typescript && node --test test/cli.test.js`

Expected: FAIL because command modules still parse arrays but commander passes objects.

- [ ] **Step 2: Replace init command**

Replace `reference/typescript/src/cli/commands/init.js` with:

```javascript
import { writeDefaultConfig } from "../../runtime/config.js";

export async function initCommand(options = {}) {
  const file = options.config ?? "aep.config.json";
  await writeDefaultConfig(file);
  console.log(`created ${file}`);
}
```

- [ ] **Step 3: Replace start command**

Replace `reference/typescript/src/cli/commands/start.js` with:

```javascript
import { startDaemon } from "../../runtime/server.js";

export async function startCommand(options = {}) {
  const configPath = options.config ?? process.env.AEP_CONFIG ?? "aep.config.json";
  await startDaemon({ configPath });
}
```

- [ ] **Step 4: Replace emit command**

Replace `reference/typescript/src/cli/commands/emit.js` with:

```javascript
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

export async function emitCommand(type, options = {}) {
  if (!type) throw new Error("emit requires an event type");
  let payload;
  try { payload = JSON.parse(options.payload ?? "{}"); } catch { throw new Error("invalid JSON payload"); }
  const event = {
    aep_version: "0.1",
    id: options.id ?? randomUUID(),
    type,
    source: options.source ?? "cli:aep",
    created_at: new Date().toISOString(),
    payload
  };
  await sendWs(options.url ?? "ws://127.0.0.1:8787/aep", event);
  console.log(JSON.stringify(event));
}

function sendWs(url, event) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, ["aep-0.1"]);
    ws.on("open", () => { ws.send(JSON.stringify(event)); ws.close(); resolve(); });
    ws.on("error", reject);
  });
}
```

- [ ] **Step 5: Replace subscribe command**

Replace `reference/typescript/src/cli/commands/subscribe.js` with:

```javascript
import { WebSocket } from "ws";
import { matchesType } from "../../subscription.js";

export async function subscribeCommand(options = {}) {
  const pattern = options.type ?? "*";
  const url = options.url ?? "ws://127.0.0.1:8787/aep";
  const ws = new WebSocket(url, ["aep-0.1"]);
  ws.on("message", (data) => {
    const event = JSON.parse(data.toString());
    if (matchesType(pattern, event.type)) console.log(JSON.stringify(event));
  });
  ws.on("error", (err) => { console.error(`subscribe: ${err.message}`); process.exitCode = 1; });
  process.on("SIGINT", () => { ws.close(); process.exit(0); });
}
```

- [ ] **Step 6: Replace dlq command**

Replace `reference/typescript/src/cli/commands/dlq.js` with:

```javascript
import { loadConfig, createDeliveryStore } from "../../runtime/config.js";

export async function dlqCommand(subcommand = "list", options = {}) {
  if (subcommand !== "list") throw new Error(`unsupported dlq command: ${subcommand}`);
  const configPath = options.config ?? process.env.AEP_CONFIG ?? "aep.config.json";
  const config = await loadConfig(configPath);
  const store = createDeliveryStore(config);
  await store.init?.();
  const stats = await store.getStats?.() ?? {};
  const records = await store.getDeadLettered?.() ?? [];
  console.log(JSON.stringify({ deadLettered: stats.deadLettered ?? records.length, records }));
  await store.close?.();
}
```

- [ ] **Step 7: Replace conformance command**

Replace `reference/typescript/src/cli/commands/conformance.js` with:

```javascript
import { runConformance } from "../../conformance.js";

export async function conformanceCommand(options = {}) {
  const { targetLevel: resolvedTarget, results } = runConformance({ targetLevel: options.level });
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

- [ ] **Step 8: Run CLI tests**

Run: `cd reference/typescript && node --test test/cli.test.js`

Expected: PASS except `status` still fails until Task 4 if status tests have already been added.

- [ ] **Step 9: Run CLI runtime e2e tests**

Run: `cd reference/typescript && node --test test/cli-runtime-e2e.test.js`

Expected: PASS.

- [ ] **Step 10: Commit and push**

```bash
git add reference/typescript/src/cli reference/typescript/test/cli.test.js reference/typescript/test/cli-runtime-e2e.test.js
git commit -m "feat: convert aep CLI commands to commander options"
git push origin master
```

---

## Task 4: Add Status Command

**Files:**
- Create: `reference/typescript/src/cli/commands/status.js`
- Modify: `reference/typescript/src/cli/aep.js`
- Test: `reference/typescript/test/cli.test.js`

- [ ] **Step 1: Write failing status test**

Append to `reference/typescript/test/cli.test.js`:

```javascript
test("aep status prints daemon health JSON", async () => {
  const server = await createJsonServer({ status: "ok", runtime: { id: "test-runtime" }, delivery: { pending: 0 } });
  try {
    const result = await run(["status", "--url", server.url]);
    assert.equal(result.code, 0, result.stderr);
    const body = JSON.parse(result.stdout);
    assert.equal(body.status, "ok");
    assert.equal(body.runtime.id, "test-runtime");
  } finally {
    await server.close();
  }
});

async function createJsonServer(body) {
  const http = await import("node:http");
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  return {
    url: `http://127.0.0.1:${port}/healthz`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd reference/typescript && node --test test/cli.test.js`

Expected: FAIL because `status command not implemented`.

- [ ] **Step 3: Implement status command**

Create `reference/typescript/src/cli/commands/status.js`:

```javascript
export async function statusCommand(options = {}) {
  const url = options.url ?? "http://127.0.0.1:8789/healthz";
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(`status request failed: ${err.message}`);
  }
  if (!response.ok) throw new Error(`status request failed: HTTP ${response.status}`);
  const text = await response.text();
  console.log(text);
}
```

Modify `reference/typescript/src/cli/aep.js`:

```javascript
import { statusCommand } from "./commands/status.js";
```

Replace the temporary status action with:

```javascript
  .action((options) => run(() => statusCommand(options)));
```

- [ ] **Step 4: Run CLI tests**

Run: `cd reference/typescript && node --test test/cli.test.js`

Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add reference/typescript/src/cli reference/typescript/test/cli.test.js
git commit -m "feat: add aep status command"
git push origin master
```

---

## Task 5: Final Verification

**Files:**
- Verify all TypeScript tests.

- [ ] **Step 1: Run full TypeScript suite**

Run: `cd reference/typescript && npm test`

Expected: all tests pass.

- [ ] **Step 2: Verify git sync status**

Run: `git status -sb`

Expected: `## master...origin/master` with no ahead/behind and no changed files.

- [ ] **Step 3: If any commits remain local, push them**

```bash
git push origin master
```

Expected: branch up to date.
