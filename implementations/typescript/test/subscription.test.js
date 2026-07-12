import assert from "node:assert/strict";
import test from "node:test";
import { matchesType, subscriptionMatches } from "../src/index.js";

test("matches dotted wildcard event type patterns", () => {
  assert.equal(matchesType("memory.*", "memory.fact.added"), true);
  assert.equal(matchesType("tool.call.*", "tool.call.progress"), true);
  assert.equal(matchesType("tool.*.progress", "tool.call.progress"), true);
  assert.equal(matchesType("context.*", "memory.fact.added"), false);
});

test("matches subscription routing metadata", () => {
  const subscription = {
    types: ["memory.*", "context.*"],
    source: ["memory:main"],
    target: "agent:researcher",
    conversation_id: "conv_01"
  };

  const event = {
    type: "memory.fact.added",
    source: "memory:main",
    target: "agent:researcher",
    conversation_id: "conv_01"
  };

  assert.equal(subscriptionMatches(subscription, event), true);
  assert.equal(subscriptionMatches(subscription, { ...event, source: "memory:other" }), false);
});
