# MCP+AEP Consumer Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a TypeScript example showing an agent invoking MCP tools synchronously while consuming correlated AEP task lifecycle events asynchronously.

**Architecture:** Add a small internal helper under `implementations/typescript/src/bridge/` that drives the existing `McpBridge` directly and groups emitted AEP events by `task_id`. Add one example script that prints the MCP immediate response and AEP lifecycle timeline, plus one focused Node test for deterministic behavior.

**Tech Stack:** Node ESM, `node:test`, existing `McpBridge`, existing `asyncToolHandler`, existing `MockStdioTransport`, package npm scripts.

---

## File Structure

- Create: `implementations/typescript/src/bridge/mcp-aep-consumer.js` â€?internal helper for MCP calls plus AEP event correlation.
- Create: `implementations/typescript/examples/mcp-aep-consumer.js` â€?runnable demo transcript.
- Create: `implementations/typescript/test/mcp-aep-consumer.test.js` â€?focused behavior tests for the helper.
- Modify: `implementations/typescript/package.json` â€?add `demo:mcp-aep-consumer` script.
- Modify: `README.md` â€?add root example command.
- Modify: `implementations/typescript/README.md` â€?add example command and scope line.
- Modify: `docs/roadmap.md` â€?link Phase 4 deliverable to the new example.

## Helper Contract

`implementations/typescript/src/bridge/mcp-aep-consumer.js` exports:

- `createDemoBridge(options = {})`
- `runMcpAepConsumerDemo(options = {})`
- `parseTaskResult(response, context)`
- `groupEventsByTask(events)`
- `waitForTaskTimelines(transport, taskIds, options = {})`

The helper is internal example support, not a stable public SDK.

---

### Task 1: Consumer Helper Tests

**Files:**
- Create: `implementations/typescript/test/mcp-aep-consumer.test.js`

- [ ] **Step 1: Write failing tests for helper behavior**

Create `implementations/typescript/test/mcp-aep-consumer.test.js` with:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoBridge,
  groupEventsByTask,
  parseTaskResult,
  runMcpAepConsumerDemo
} from "../src/bridge/mcp-aep-consumer.js";

test("parseTaskResult extracts task_id from MCP tool response", () => {
  const result = parseTaskResult({
    jsonrpc: "2.0",
    id: 1,
    result: {
      content: [{ type: "text", text: JSON.stringify({ task_id: "task_123", status: "accepted" }) }]
    }
  }, { method: "tools/call", toolName: "crawl" });

  assert.deepEqual(result, { task_id: "task_123", status: "accepted" });
});

test("parseTaskResult rejects MCP error responses", () => {
  assert.throws(() => parseTaskResult({
    jsonrpc: "2.0",
    id: 1,
    error: { code: -32602, message: "Unknown tool: missing" }
  }, { method: "tools/call", toolName: "missing" }), /MCP tools\/call for missing failed: Unknown tool: missing/);
});

test("groupEventsByTask groups only task events with task_id", () => {
  const grouped = groupEventsByTask([
    { type: "task.accepted", task_id: "task_a" },
    { type: "memory.fact.added", payload: {} },
    { type: "task.started", task_id: "task_a" },
    { type: "task.accepted", task_id: "task_b" }
  ]);

  assert.deepEqual([...grouped.keys()], ["task_a", "task_b"]);
  assert.deepEqual(grouped.get("task_a").map((event) => event.type), ["task.accepted", "task.started"]);
  assert.deepEqual(grouped.get("task_b").map((event) => event.type), ["task.accepted"]);
});

test("runMcpAepConsumerDemo correlates MCP task IDs with AEP lifecycle events", async () => {
  const summary = await runMcpAepConsumerDemo({ delayMs: 1, timeoutMs: 500 });

  assert.deepEqual(summary.tools.map((tool) => tool.name), ["web_crawl", "index_docs"]);
  assert.equal(summary.calls.length, 2);

  for (const call of summary.calls) {
    assert.ok(call.task_id);
    assert.equal(call.status, "accepted");
    assert.deepEqual(call.events.map((event) => event.type), [
      "task.accepted",
      "task.started",
      "task.progress",
      "task.completed"
    ]);
  }
});

test("createDemoBridge exposes the expected demo tools", async () => {
  const { bridge } = createDemoBridge({ delayMs: 1 });
  const response = await bridge.handleRequest({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });

  assert.deepEqual(response.result.tools.map((tool) => tool.name), ["web_crawl", "index_docs"]);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd implementations/typescript
npm test -- test/mcp-aep-consumer.test.js
```

Expected: FAIL with a module-not-found error for `../src/bridge/mcp-aep-consumer.js`.

- [ ] **Step 3: Commit the failing test**

Run:

```bash
git add implementations/typescript/test/mcp-aep-consumer.test.js
git commit -m "test: specify MCP and AEP consumer example"
```

Expected: commit succeeds with only the new test file.

---

### Task 2: Consumer Helper Implementation

**Files:**
- Create: `implementations/typescript/src/bridge/mcp-aep-consumer.js`

- [ ] **Step 1: Add the helper implementation**

Create `implementations/typescript/src/bridge/mcp-aep-consumer.js` with:

```js
import { McpBridge, asyncToolHandler } from "./mcp-bridge.js";
import { MockStdioTransport } from "../transport/stdio.js";

const TERMINAL_TASK_EVENTS = new Set(["task.completed", "task.failed", "task.cancelled", "task.timed_out"]);

export function createDemoBridge(options = {}) {
  const delayMs = options.delayMs ?? 50;
  const transport = options.transport ?? new MockStdioTransport();
  const bridge = new McpBridge({ transport });

  bridge.registerTool(asyncToolHandler("web_crawl", {
    description: "Crawl a URL and index its content. Returns immediately with a task_id; progress and results are delivered as AEP events.",
    inputSchema: {
      properties: {
        url: { type: "string", description: "URL to crawl" },
        depth: { type: "number", description: "Crawl depth" }
      },
      required: ["url"]
    },
    work: async (args) => {
      await sleep(delayMs);
      return { pages_indexed: 42, url: args.url, depth: args.depth ?? 1 };
    }
  }));

  bridge.registerTool(asyncToolHandler("index_docs", {
    description: "Index documents into memory. Async task with AEP lifecycle events.",
    inputSchema: {
      properties: {
        path: { type: "string", description: "Path to documents" }
      },
      required: ["path"]
    },
    work: async (args) => {
      await sleep(delayMs);
      return { documents_indexed: 150, path: args.path };
    }
  }));

  return { bridge, transport };
}

export async function runMcpAepConsumerDemo(options = {}) {
  const { bridge, transport } = createDemoBridge(options);
  await transport.start();

  try {
    await expectMcpSuccess(await bridge.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "0.1.0", capabilities: {}, clientInfo: { name: "mcp-aep-consumer", version: "1.0.0" } }
    }), { method: "initialize" });

    const toolsResponse = await expectMcpSuccess(await bridge.handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    }), { method: "tools/list" });

    const callSpecs = [
      { id: 3, toolName: "web_crawl", arguments: { url: "https://example.com", depth: 2 } },
      { id: 4, toolName: "index_docs", arguments: { path: "/docs" } }
    ];

    const calls = [];
    for (const spec of callSpecs) {
      const response = await bridge.handleRequest({
        jsonrpc: "2.0",
        id: spec.id,
        method: "tools/call",
        params: { name: spec.toolName, arguments: spec.arguments }
      });
      const task = parseTaskResult(response, { method: "tools/call", toolName: spec.toolName });
      calls.push({ tool: spec.toolName, arguments: spec.arguments, ...task });
    }

    const timelines = await waitForTaskTimelines(
      transport,
      calls.map((call) => call.task_id),
      { timeoutMs: options.timeoutMs ?? 1000 }
    );

    return {
      tools: toolsResponse.result.tools,
      calls: calls.map((call) => ({ ...call, events: timelines.get(call.task_id) ?? [] }))
    };
  } finally {
    await transport.stop();
  }
}

export function parseTaskResult(response, context = {}) {
  if (response?.error) {
    throw new Error(`MCP ${context.method ?? "request"} for ${context.toolName ?? "unknown"} failed: ${response.error.message}`);
  }

  const text = response?.result?.content?.find((item) => item.type === "text")?.text;
  if (typeof text !== "string") {
    throw new Error(`MCP ${context.toolName ?? "tool"} response did not include text content`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`MCP ${context.toolName ?? "tool"} response text was not JSON: ${err.message}`);
  }

  if (!parsed.task_id) {
    throw new Error(`MCP ${context.toolName ?? "tool"} response did not include task_id`);
  }

  return parsed;
}

export function groupEventsByTask(events) {
  const grouped = new Map();
  for (const event of events) {
    if (!event?.type?.startsWith("task.") || !event.task_id) continue;
    if (!grouped.has(event.task_id)) grouped.set(event.task_id, []);
    grouped.get(event.task_id).push(event);
  }
  return grouped;
}

export async function waitForTaskTimelines(transport, taskIds, options = {}) {
  const timeoutMs = options.timeoutMs ?? 1000;
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const events = transport.sent
      .map((message) => typeof message === "string" ? JSON.parse(message) : message)
      .filter(Boolean);
    const grouped = groupEventsByTask(events);

    if (taskIds.every((taskId) => grouped.get(taskId)?.some((event) => TERMINAL_TASK_EVENTS.has(event.type)))) {
      return grouped;
    }

    await sleep(10);
  }

  throw new Error(`Timed out waiting for terminal AEP events for tasks: ${taskIds.join(", ")}`);
}

async function expectMcpSuccess(response, context) {
  if (response?.error) {
    throw new Error(`MCP ${context.method} failed: ${response.error.message}`);
  }
  return response;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
cd implementations/typescript
npm test -- test/mcp-aep-consumer.test.js
```

Expected: PASS, 5 tests pass.

- [ ] **Step 3: Commit**

Run:

```bash
git add implementations/typescript/src/bridge/mcp-aep-consumer.js
git commit -m "feat: add MCP and AEP consumer helper"
```

Expected: commit succeeds.

---

### Task 3: Demo Script And Package Command

**Files:**
- Create: `implementations/typescript/examples/mcp-aep-consumer.js`
- Modify: `implementations/typescript/package.json`

- [ ] **Step 1: Verify demo command fails before adding script**

Run:

```bash
cd implementations/typescript
npm run demo:mcp-aep-consumer
```

Expected: FAIL with missing script.

- [ ] **Step 2: Add the demo script**

Create `implementations/typescript/examples/mcp-aep-consumer.js` with:

```js
#!/usr/bin/env node
import { runMcpAepConsumerDemo } from "../src/bridge/mcp-aep-consumer.js";

console.log("=== MCP + AEP Consumer Demo ===\n");
console.log("MCP invokes tools and returns task IDs immediately.");
console.log("AEP delivers asynchronous task lifecycle events for those task IDs.\n");

const summary = await runMcpAepConsumerDemo({ delayMs: 100, timeoutMs: 1500 });

console.log("Available MCP tools:");
for (const tool of summary.tools) {
  console.log(`  - ${tool.name}: ${tool.description}`);
}

console.log("\nImmediate MCP tool results:");
for (const call of summary.calls) {
  console.log(`  [${call.tool}] task_id=${call.task_id} status=${call.status}`);
}

console.log("\nCorrelated AEP timelines:");
for (const call of summary.calls) {
  console.log(`  ${call.task_id} (${call.tool})`);
  for (const event of call.events) {
    const detail = event.payload?.message ? ` - ${event.payload.message}` : "";
    console.log(`    ${event.type}${detail}`);
  }
}
```

- [ ] **Step 3: Add the npm script**

In `implementations/typescript/package.json`, add this script while preserving existing scripts:

```json
"demo:mcp-aep-consumer": "node ./examples/mcp-aep-consumer.js"
```

- [ ] **Step 4: Run the demo**

Run:

```bash
cd implementations/typescript
npm run demo:mcp-aep-consumer
```

Expected: output includes `Immediate MCP tool results`, `Correlated AEP timelines`, both task IDs, and lifecycle lines for `task.accepted`, `task.started`, `task.progress`, and `task.completed`.

- [ ] **Step 5: Commit**

Run:

```bash
git add implementations/typescript/examples/mcp-aep-consumer.js implementations/typescript/package.json
git commit -m "feat: add MCP and AEP consumer demo"
```

Expected: commit succeeds.

---

### Task 4: Documentation Updates

**Files:**
- Modify: `README.md`
- Modify: `implementations/typescript/README.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Update root README example command list**

In `README.md`, add this command to the existing examples block after `demo:mcp-bridge`:

```sh
cd implementations/typescript && npm run demo:mcp-aep-consumer
```

- [ ] **Step 2: Update TypeScript README example command list and scope**

In `implementations/typescript/README.md`, add this command to the examples block after `demo:mcp-bridge`:

```sh
npm run demo:mcp-aep-consumer
```

Also replace the scope line:

```markdown
- MCP bridge and demo
```

with:

```markdown
- MCP bridge, bridge demo, and MCP+AEP consumer demo
```

- [ ] **Step 3: Update roadmap Phase 4**

In `docs/roadmap.md`, replace:

```markdown
- Example agent consuming both MCP and AEP
```

with:

```markdown
- Example agent consuming both MCP and AEP (`implementations/typescript/examples/mcp-aep-consumer.js`)
```

- [ ] **Step 4: Commit**

Run:

```bash
git add README.md implementations/typescript/README.md docs/roadmap.md
git commit -m "docs: document MCP and AEP consumer demo"
```

Expected: commit succeeds.

---

### Task 5: Full Verification And Push

**Files:**
- No file changes expected unless verification exposes a defect.

- [ ] **Step 1: Run TypeScript tests**

Run:

```bash
cd implementations/typescript
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run the new demo**

Run:

```bash
cd implementations/typescript
npm run demo:mcp-aep-consumer
```

Expected: demo prints immediate MCP task results and correlated AEP timelines for two tasks.

- [ ] **Step 3: Run conformance**

Run:

```bash
cd implementations/typescript
npm run conformance
```

Expected: AEP-C1 conformance passes and AEP-C2 delivery fixture is skipped.

- [ ] **Step 4: Run Python tests**

Run:

```bash
cd implementations/python
python -m pytest --tb=short -q
```

Expected: all tests pass.

- [ ] **Step 5: Push**

Run:

```bash
git status --short
git log --oneline -5
git push
git status --short
```

Expected: initial and final status are clean. Push updates `master -> master` over SSH.

---

## Self-Review Notes

- Spec coverage: Task 1 covers behavior tests; Task 2 implements helper responsibilities and error handling; Task 3 adds demo and npm script; Task 4 updates docs and roadmap; Task 5 verifies and pushes.
- Scope: no transport-backed server, no reusable SDK, no protocol semantic changes.
- Type consistency: helper returns `task_id`, `status`, `tools`, `calls`, and `events`; tests and demo use the same names.
- Placeholder scan: no incomplete placeholder markers remain.
