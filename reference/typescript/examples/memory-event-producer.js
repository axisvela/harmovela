#!/usr/bin/env node
import { AepHarness, MockStdioTransport, AepSession, subscriptionMatches } from "../src/index.js";

console.log("=== Memory Event Producer Demo ===\n");

const transport = new MockStdioTransport();
await transport.start();

const now = () => new Date().toISOString();
const harness = new AepHarness({ source: "memory:main", now });

// Start a session
const session = new AepSession({ id: "sess_mem", source: "memory:main" });
transport.send(session.opened());
transport.send(session.ready({
  protocol: "aep", aep_version: "0.1", transports: ["stdio"],
  features: ["envelope", "subscription", "memory_events"],
}));

// Simulate subscription from an agent
const subscription = {
  types: ["memory.*"],
  source: ["memory:main"],
  target: "agent:researcher",
  conversation_id: "conv_demo",
};

console.log("[agent] Subscribes to memory.* events for conv_demo\n");

// Produce memory events
const events = [
  {
    type: "memory.fact.added",
    payload: { fact_id: "fact_001", text: "AEP complements MCP for async workflows.", source: "doc:protocol-overview", confidence: 0.95 },
  },
  {
    type: "memory.preference.updated",
    payload: { key: "response_style", value: "concise", previous: "verbose" },
  },
  {
    type: "memory.summary.ready",
    payload: { summary_id: "sum_001", text: "Session covered AEP envelope design and subscription model.", token_count: 1200 },
  },
  {
    type: "memory.fact.invalidated",
    payload: { fact_id: "fact_old_042", reason: "superseded by new information in fact_001" },
  },
  {
    type: "memory.retrieval.ready",
    payload: { query: "AEP subscription model", results: 12, top_score: 0.91 },
  },
];

console.log("[memory] Emitting 5 memory events...\n");

for (const { type, payload } of events) {
  const event = {
    aep_version: "0.1",
    id: `evt_${type.replace(/\./g, "_")}_${Date.now().toString(36)}`,
    type,
    source: "memory:main",
    target: "agent:researcher",
    session_id: "sess_mem",
    conversation_id: "conv_demo",
    created_at: now(),
    delivery: { mode: "at_least_once", sequence: Math.floor(Math.random() * 1000) },
    payload,
  };

  // Route: only deliver if subscription matches
  const matches = subscriptionMatches(subscription, event);
  if (matches) {
    transport.send(event);
    console.log(`  [send] ${type}`);
  } else {
    console.log(`  [skip] ${type} (no matching subscription)`);
  }

  await new Promise((r) => setTimeout(r, 200));
}

transport.send(session.close());

console.log("\n=== Events Delivered ===");
for (const msg of transport.sent) {
  const event = typeof msg === "string" ? JSON.parse(msg) : msg;
  console.log(`  [${event.type}] ${event.payload?.fact_id ?? event.payload?.key ?? event.payload?.query ?? ""}`);
}

await transport.stop();
