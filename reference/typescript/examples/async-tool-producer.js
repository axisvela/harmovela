#!/usr/bin/env node
import { AepHarness, TaskTracker, MockStdioTransport } from "../src/index.js";

console.log("=== Async Tool Producer Demo ===\n");

const transport = new MockStdioTransport();
await transport.start();

const toolName = "doc_indexer";
const harness = new AepHarness({ source: `tool:${toolName}`, now: () => new Date().toISOString() });

// Accept a task and simulate work with lifecycle events
async function runTask(args) {
  const tracker = new TaskTracker({
    task_id: args.task_id ?? `task_${Date.now().toString(36)}`,
    source: `tool:${toolName}`,
    description: args.query ?? "index documents",
  });

  console.log("[tool] Task accepted:", tracker.id);
  transport.send(tracker.accepted());

  await sleep(300);
  console.log("[tool] Task started");
  transport.send(tracker.started());

  await sleep(500);
  console.log("[tool] Progress: 40%");
  transport.send(tracker.progress({ progress: 0.4, message: "Indexing chunks..." }));

  await sleep(700);
  console.log("[tool] Progress: 80%");
  transport.send(tracker.progress({ progress: 0.8, message: "Building embeddings..." }));

  await sleep(400);
  console.log("[tool] Task completed");
  transport.send(tracker.completed({
    documents_indexed: 256,
    embeddings_generated: 1024,
    duration_ms: 1900,
  }));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Simulate an incoming task.submitted via AEP
const submitEvent = {
  aep_version: "0.1",
  id: "evt_submit_01",
  type: "task.submitted",
  source: "agent:researcher",
  target: `tool:${toolName}`,
  task_id: "task_demo_001",
  created_at: new Date().toISOString(),
  payload: { description: "Index all documents in /docs", query: "index /docs" },
};

console.log("[agent] Submitting task...\n");
const [response] = harness.handle(submitEvent);
console.log("[harness]", response.type, "→", response.payload.task_id);

await runTask({ task_id: response.payload.task_id, query: "index /docs" });

console.log("\n=== AEP Events Emitted ===");
for (const msg of transport.sent) {
  const event = typeof msg === "string" ? JSON.parse(msg) : msg;
  console.log(`  [${event.type}] ${event.task_id ?? ""} ${event.payload?.progress ? `${(event.payload.progress * 100).toFixed(0)}%` : ""}`);
}

await transport.stop();
