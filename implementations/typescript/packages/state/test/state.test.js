import assert from "node:assert/strict";
import test from "node:test";
import { STATE_EVENT_TYPES, isStateEventType } from "../src/index.js";

test("state event types includes all registry entries", () => {
  const expected = [
    "state.snapshot.requested",
    "state.snapshot.ready",
    "state.delta.applied",
    "state.invalidated",
    "freshness.expired",
    "freshness.window.changed"
  ];
  for (const type of expected) {
    assert.equal(STATE_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(STATE_EVENT_TYPES.size, expected.length);
});

test("isStateEventType positives", () => {
  assert.equal(isStateEventType("state.snapshot.requested"), true);
  assert.equal(isStateEventType("state.snapshot.ready"), true);
  assert.equal(isStateEventType("state.delta.applied"), true);
  assert.equal(isStateEventType("state.invalidated"), true);
  assert.equal(isStateEventType("freshness.expired"), true);
  assert.equal(isStateEventType("freshness.window.changed"), true);
});

test("isStateEventType negatives", () => {
  assert.equal(isStateEventType("task.submitted"), false);
  assert.equal(isStateEventType("session.opened"), false);
  assert.equal(isStateEventType("context.updated"), false);
  assert.equal(isStateEventType(""), false);
});
