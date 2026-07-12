#!/usr/bin/env node
import { McpBridge, asyncToolHandler } from "@axisrobo/aep";

const events = [];
const bridge = new McpBridge({ transport: { send: (event) => events.push(event) } });

bridge.registerTool(asyncToolHandler("build", { description: "build tool", work: (args, tracker) => {
  return { artifact: "app.bin", task_id: tracker.ID };
} }));

const resp = await bridge.handleRequest({
  jsonrpc: "2.0", id: 1, method: "tools/call",
  params: { name: "build", arguments: { _task_id: "task_demo" } }
});
console.log("tools/call response:", JSON.stringify(resp.result.content));

await new Promise((r) => setTimeout(r, 500));
console.log("lifecycle events:", events.map((e) => e.type).join(" → "));
