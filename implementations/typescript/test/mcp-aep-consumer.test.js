import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoBridge,
  groupEventsByTask,
  parseTaskResult,
  runMcpAepConsumerDemo
} from "@axisrobo/harmovela-mcp-bridge";

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

test("parseTaskResult rejects MCP tool-level error results", () => {
  assert.throws(() => parseTaskResult({
    jsonrpc: "2.0",
    id: 1,
    result: {
      isError: true,
      content: [{ type: "text", text: "something broke" }]
    }
  }, { method: "tools/call", toolName: "bad_tool" }), /MCP tools\/call for bad_tool failed: something broke/);
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

test("runMcpAepConsumerDemo correlates MCP task IDs with Harmovela lifecycle events", async () => {
  const summary = await runMcpAepConsumerDemo({ delayMs: 1, timeoutMs: 500 });

  assert.deepEqual(summary.tools.map((tool) => tool.name), ["web_crawl", "index_docs"]);
  assert.equal(summary.calls.length, 2);
  assert.deepEqual(summary.calls.map((call) => call.task_id), ["task_demo_web_crawl", "task_demo_index_docs"]);

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
