#!/usr/bin/env node
import { McpBridge, asyncToolHandler } from "../src/bridge/mcp-bridge.js";
import { SqliteDeliveryStore, DeliveryTracker, retryDelay, DeliveryJournal } from "@axisrobo/harmovela-recovery";
import { MockStdioTransport } from "@axisrobo/harmovela-event";

const DEFAULT_MAX_ATTEMPTS = 3;

console.log("=== AEP Production E2E Demo ===\n");

// Act 1 – Setup
const store = new SqliteDeliveryStore(":memory:");
const journal = new DeliveryJournal();
const tracker = new DeliveryTracker({ store, journal });
const transport = new MockStdioTransport();
await transport.start();

const bridge = new McpBridge({ transport });
bridge.registerTool(asyncToolHandler("crawl_url", {
  description: "Crawl a URL and index its content",
  inputSchema: {
    properties: {
      url: { type: "string", description: "URL to crawl" },
      depth: { type: "number", description: "Crawl depth" }
    },
    required: ["url"]
  },
  work: async (args) => ({ pages_indexed: 42, url: args.url, depth: args.depth ?? 1 })
}));
bridge.registerTool(asyncToolHandler("analyze_data", {
  description: "Analyze data asynchronously",
  inputSchema: {
    properties: { query: { type: "string", description: "Query to analyze" } },
    required: ["query"]
  },
  work: async (args) => ({ result: "analysis complete", query: args.query })
}));

console.log("[Setup] SqliteDeliveryStore + DeliveryTracker + McpBridge ready\n");

// Act 2 – Task submission
await bridge.handleRequest({
  jsonrpc: "2.0", id: 1, method: "initialize",
  params: { protocolVersion: "0.1.0", capabilities: {}, clientInfo: { name: "e2e-demo", version: "1.0.0" } }
});
await bridge.handleRequest({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

console.log("--- Retry + Dead-Letter ---");

const retryResp = await bridge.handleRequest({
  jsonrpc: "2.0", id: 3, method: "tools/call",
  params: { name: "crawl_url", arguments: { _task_id: "task_retry_01", url: "https://example.com", depth: 2 } }
});
const retryTask = JSON.parse(retryResp.result.content[0].text);
console.log(`MCP tools/call \u2192 task_id=${retryTask.task_id} (accepted)`);

tracker.track(retryTask.task_id);

for (let i = 0; i < 3; i++) {
  const attempts = tracker.nack(retryTask.task_id);
  if (attempts <= DEFAULT_MAX_ATTEMPTS) {
    const delay = retryDelay(attempts);
    console.log(`[nack] attempt ${attempts} \u2192 backoff ${delay}ms`);
  } else {
    console.log(`[nack] attempt ${attempts} \u2192 max attempts = ${DEFAULT_MAX_ATTEMPTS} reached`);
  }
}

const dlEvent = tracker.deadLetter(retryTask.task_id);
console.log(`[dead-letter] ${retryTask.task_id} moved to DLQ\n`);

// Act 4 – Happy Path
console.log("--- Happy Path ---");

const happyResp = await bridge.handleRequest({
  jsonrpc: "2.0", id: 4, method: "tools/call",
  params: { name: "analyze_data", arguments: { _task_id: "task_happy_01", query: "test query" } }
});
const happyTask = JSON.parse(happyResp.result.content[0].text);
console.log(`MCP tools/call \u2192 task_id=${happyTask.task_id} (accepted)`);

tracker.track(happyTask.task_id);
tracker.ack(happyTask.task_id);
console.log(`[ack] ${happyTask.task_id} acknowledged\n`);

// Act 5 – Summary
const stats = tracker.stats;
console.log("=== Store Summary ===");
console.log(`Pending:  ${String(stats.pending).padStart(2)}`);
console.log(`Acked:    ${String(stats.acknowledged).padStart(2)}`);
console.log(`DLQ:      ${String(stats.deadLettered).padStart(2)}`);

const replayEntries = journal.replay();
if (replayEntries.length > 0) {
  console.log(`\nJournal entries: ${replayEntries.length}`);
}

const storeStats = store.getStats();
console.log(`\nSQLite stats: sequences=${storeStats.totalSequences}, pending=${storeStats.pending}, acked=${storeStats.acknowledged}, dlq=${storeStats.deadLettered}`);

// Act 6 – Cleanup
await transport.stop();
store.close();
