import assert from "node:assert/strict";
import test from "node:test";
import { TOOL_EVENT_TYPES, isToolEventType } from "../src/index.js";

test("tool event types includes all 11 registry entries", () => {
  const expected = [
    "tool.call.requested",
    "tool.call.accepted",
    "tool.call.rejected",
    "tool.call.started",
    "tool.call.progress",
    "tool.call.output",
    "tool.call.completed",
    "tool.call.failed",
    "tool.call.cancel.requested",
    "tool.call.cancelled",
    "tool.call.timed_out"
  ];
  for (const type of expected) {
    assert.equal(TOOL_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(TOOL_EVENT_TYPES.size, expected.length);
});

test("isToolEventType positives", () => {
  assert.equal(isToolEventType("tool.call.requested"), true);
  assert.equal(isToolEventType("tool.call.accepted"), true);
  assert.equal(isToolEventType("tool.call.started"), true);
  assert.equal(isToolEventType("tool.call.progress"), true);
  assert.equal(isToolEventType("tool.call.completed"), true);
  assert.equal(isToolEventType("tool.call.failed"), true);
  assert.equal(isToolEventType("tool.call.cancelled"), true);
  assert.equal(isToolEventType("tool.call.timed_out"), true);
});

test("isToolEventType negatives", () => {
  assert.equal(isToolEventType("task.submitted"), false);
  assert.equal(isToolEventType("session.opened"), false);
  assert.equal(isToolEventType("context.updated"), false);
  assert.equal(isToolEventType(""), false);
});
