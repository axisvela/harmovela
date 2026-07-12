import assert from "node:assert/strict";
import test from "node:test";
import { McpBridge, asyncToolHandler } from "../src/bridge/mcp-bridge.js";
import { MockStdioTransport } from "../src/transport/stdio.js";

test("McpBridge responds to initialize", async () => {
  const bridge = new McpBridge();
  const response = await bridge.handleRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "0.1.0", capabilities: {}, clientInfo: { name: "test", version: "1.0" } }
  });

  assert.equal(response.id, 1);
  assert.equal(response.result.protocolVersion, "0.1.0");
  assert.equal(response.result.serverInfo.name, "aep-mcp-bridge");
  assert.ok(response.result.capabilities.tools);
});

test("McpBridge returns tools/list", async () => {
  const bridge = new McpBridge();
  bridge.registerTool(asyncToolHandler("test_tool", {
    description: "A test tool",
    inputSchema: { properties: { input: { type: "string" } }, required: ["input"] },
    work: async () => ({ done: true })
  }));

  bridge._initialized = true;

  const response = await bridge.handleRequest({
    jsonrpc: "2.0", id: 2, method: "tools/list", params: {}
  });

  assert.equal(response.result.tools.length, 1);
  assert.equal(response.result.tools[0].name, "test_tool");
});

test("McpBridge tools/call returns task_id and emits AEP lifecycle events", async () => {
  const transport = new MockStdioTransport();
  await transport.start();

  const bridge = new McpBridge({ transport });
  bridge.registerTool(asyncToolHandler("crawl", {
    description: "Crawl and index",
    inputSchema: { properties: { url: { type: "string" } }, required: ["url"] },
    work: async (args) => ({ pages: 10, url: args.url })
  }));

  bridge._initialized = true;

  const response = await bridge.handleRequest({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "crawl", arguments: { url: "https://example.com" } }
  });

  assert.equal(response.id, 3);
  assert.ok(!response.error);

  const resultText = JSON.parse(response.result.content[0].text);
  assert.equal(resultText.status, "accepted");
  assert.ok(resultText.task_id);

  // Wait for background AEP events
  await new Promise((r) => setTimeout(r, 200));

  const events = transport.sent
    .map((s) => typeof s === "string" ? JSON.parse(s) : s)
    .filter(Boolean);

  const types = events.map((e) => e.type);
  assert.ok(types.includes("task.started"));
  assert.ok(types.includes("task.progress"));
  assert.ok(types.includes("task.completed"));

  await transport.stop();
});

test("McpBridge tools/call handles errors gracefully", async () => {
  const transport = new MockStdioTransport();
  await transport.start();

  const bridge = new McpBridge({ transport });
  bridge.registerTool(asyncToolHandler("bad_tool", {
    description: "Fails",
    inputSchema: {},
    work: async () => { throw new Error("something broke"); }
  }));

  bridge._initialized = true;

  const response = await bridge.handleRequest({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "bad_tool", arguments: {} }
  });

  // MCP response should still succeed (task accepted), background emits task.failed
  const resultText = JSON.parse(response.result.content[0].text);
  assert.equal(resultText.status, "accepted");

  await new Promise((r) => setTimeout(r, 200));

  const events = transport.sent
    .map((s) => typeof s === "string" ? JSON.parse(s) : s)
    .filter(Boolean);

  const types = events.map((e) => e.type);
  assert.ok(types.includes("task.failed"));

  await transport.stop();
});

test("McpBridge returns error for unknown methods", async () => {
  const bridge = new McpBridge();
  const response = await bridge.handleRequest({
    jsonrpc: "2.0", id: 5, method: "unknown_method", params: {}
  });

  assert.equal(response.error.code, -32601);
});
