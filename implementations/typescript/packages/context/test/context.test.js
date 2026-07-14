import assert from "node:assert/strict";
import test from "node:test";
import { CONTEXT_MEMORY_EVENT_TYPES, isContextMemoryEventType } from "../src/index.js";

test("context/memory event types includes all 15 registry entries", () => {
  const expected = [
    "context.updated",
    "context.invalidated",
    "context.snapshot.requested",
    "context.snapshot.ready",
    "context.retrieval.started",
    "context.retrieval.completed",
    "context.retrieval.failed",
    "memory.fact.added",
    "memory.fact.updated",
    "memory.fact.invalidated",
    "memory.episode.stored",
    "memory.preference.updated",
    "memory.constraint.updated",
    "memory.summary.ready",
    "memory.retrieval.ready"
  ];
  for (const type of expected) {
    assert.equal(CONTEXT_MEMORY_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(CONTEXT_MEMORY_EVENT_TYPES.size, expected.length);
});

test("isContextMemoryEventType positives", () => {
  assert.equal(isContextMemoryEventType("context.updated"), true);
  assert.equal(isContextMemoryEventType("context.invalidated"), true);
  assert.equal(isContextMemoryEventType("memory.fact.added"), true);
  assert.equal(isContextMemoryEventType("memory.retrieval.ready"), true);
});

test("isContextMemoryEventType negatives", () => {
  assert.equal(isContextMemoryEventType("task.submitted"), false);
  assert.equal(isContextMemoryEventType("session.opened"), false);
  assert.equal(isContextMemoryEventType("state.delta.applied"), false);
  assert.equal(isContextMemoryEventType(""), false);
});
