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
