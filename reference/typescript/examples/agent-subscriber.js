#!/usr/bin/env node
import { AepHarness, MockStdioTransport, AepSession } from "../src/index.js";

console.log("=== Agent Subscriber Demo ===\n");

const transport = new MockStdioTransport();
await transport.start();

const now = () => new Date().toISOString();
const harness = new AepHarness({ source: "agent:researcher", now });

// Start a session with the harness
const session = new AepSession({ id: "sess_agent", source: "agent:researcher" });
console.log("[agent] Opening session...");
const [readyResponse] = harness.handle({
  aep_version: "0.1", id: "init_01", type: "session.opened",
  source: "memory:main", session_id: "sess_agent", created_at: now(),
  payload: { session_id: "sess_agent", version: "0.1" },
});
console.log("  ←", readyResponse.type);

// Subscribe to memory and context events
console.log("\n[agent] Subscribing to memory.* + context.* ...");
const [subResponse] = harness.handle({
  aep_version: "0.1", id: "sub_req_01", type: "subscription.requested",
  source: "agent:researcher", session_id: "sess_agent", created_at: now(),
  payload: { types: ["memory.*", "context.*"], target: "agent:researcher" },
});
console.log("  ←", subResponse.type, subResponse.payload.subscription_id);

// Simulate incoming events from various producers
const incomingEvents = [
  {
    type: "context.invalidated", source: "context:browser",
    payload: { reason: "user navigated to new page", previous_url: "/research", new_url: "/results" },
  },
  {
    type: "memory.fact.added", source: "memory:main",
    payload: { fact_id: "fact_101", text: "Agent successfully subscribed to AEP stream.", confidence: 0.99 },
  },
  {
    type: "context.snapshot.ready", source: "context:browser",
    payload: { url: "/results", title: "Search Results", token_count: 3400 },
  },
  {
    type: "task.progress", source: "tool:crawler",
    payload: { task_id: "task_not_subscribed", progress: 0.5 },
  },
  {
    type: "memory.retrieval.ready", source: "memory:main",
    payload: { query: "AEP events", results: 5, top_score: 0.88 },
  },
];

console.log("\n[agent] Processing incoming events...\n");

for (const evt of incomingEvents) {
  const event = {
    aep_version: "0.1",
    id: `incoming_${Date.now().toString(36)}`,
    session_id: "sess_agent",
    conversation_id: "conv_demo",
    created_at: now(),
    delivery: { mode: "at_least_once", sequence: Math.floor(Math.random() * 1000) },
    ...evt,
  };

  const responses = harness.handle(event);
  const ack = responses.find((r) => r.type === "event.acknowledged");
  const rejected = responses.find((r) => r.type === "event.rejected");

  if (rejected) {
    console.log(`  [reject] ${event.type} — ${rejected.payload?.error?.message ?? rejected.payload?.errors?.[0]}`);
  } else if (ack) {
    console.log(`  [ack] ${event.type} → ${event.payload?.fact_id ?? event.payload?.reason ?? event.payload?.query ?? ""}`);
  } else {
    console.log(`  [process] ${event.type} → ${JSON.stringify(event.payload).substring(0, 60)}`);
  }

  await new Promise((r) => setTimeout(r, 100));
}

// Close session
console.log("\n[agent] Closing session...");
const closeResponses = harness.handle({
  aep_version: "0.1", id: "close_01", type: "session.closed",
  source: "agent:researcher", session_id: "sess_agent", created_at: now(),
  payload: { session_id: "sess_agent", reason: "done" },
});

for (const resp of closeResponses) {
  console.log("  ←", resp.type);
}

await transport.stop();
