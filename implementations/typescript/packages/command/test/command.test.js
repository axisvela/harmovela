import assert from "node:assert/strict";
import test from "node:test";
import { COMMAND_EVENT_TYPES, isCommandEventType } from "../src/index.js";

test("command event types includes all 5 registry entries", () => {
  const expected = [
    "command.requested",
    "command.accepted",
    "command.rejected",
    "command.completed",
    "command.failed"
  ];
  for (const type of expected) {
    assert.equal(COMMAND_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(COMMAND_EVENT_TYPES.size, expected.length);
});

test("isCommandEventType positives", () => {
  assert.equal(isCommandEventType("command.requested"), true);
  assert.equal(isCommandEventType("command.accepted"), true);
  assert.equal(isCommandEventType("command.rejected"), true);
  assert.equal(isCommandEventType("command.completed"), true);
  assert.equal(isCommandEventType("command.failed"), true);
});

test("isCommandEventType negatives", () => {
  assert.equal(isCommandEventType("task.submitted"), false);
  assert.equal(isCommandEventType("session.opened"), false);
  assert.equal(isCommandEventType("query.requested"), false);
  assert.equal(isCommandEventType(""), false);
});
