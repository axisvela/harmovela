#!/usr/bin/env node
import { McpBridge, asyncToolHandler } from "../../src/bridge/mcp-bridge.js";
import { runMcpBridge } from "../../src/bridge/stdio.js";
import { MockStdioTransport } from "@axisrobo/harmovela-event";

const transport = new MockStdioTransport();
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
    await new Promise((r) => setTimeout(r, 500));
    return { pages_indexed: 42, url: args.url };
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
    await new Promise((r) => setTimeout(r, 300));
    return { documents_indexed: 150, path: args.path };
  }
}));

// Collect AEP events emitted by tools
transport.on("message", (event) => {
  // In a real scenario, these would be sent to AEP subscribers
});

if (process.argv.includes("--server")) {
  runMcpBridge(bridge);
} else {
  // Demo mode: simulate MCP client calls
  console.log("=== AEP MCP Bridge Demo ===\n");

  const requests = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "0.1.0", capabilities: {}, clientInfo: { name: "demo", version: "1.0.0" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "web_crawl", arguments: { url: "https://example.com", depth: 2 } } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "index_docs", arguments: { path: "/docs" } } }
  ];

  for (const req of requests) {
    console.log("->", JSON.stringify(req));
    const res = await bridge.handleRequest(req);
    if (res) console.log("<-", JSON.stringify(res));
    console.log();
  }

  // Wait for background AEP events
  await new Promise((r) => setTimeout(r, 1000));

  console.log("=== AEP Events Emitted ===");
  for (const msg of transport.sent) {
    try {
      const event = typeof msg === "string" ? JSON.parse(msg) : msg;
      console.log(`  [${event.type}] ${event.task_id}`);
    } catch {}
  }

  process.exit(0);
}
