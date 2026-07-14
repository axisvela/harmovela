import assert from "node:assert/strict";
import test from "node:test";
import { QUERY_EVENT_TYPES, isQueryEventType } from "../src/index.js";

test("query event types includes all 4 registry entries", () => {
  const expected = [
    "query.requested",
    "query.response",
    "query.rejected",
    "query.error"
  ];
  for (const type of expected) {
    assert.equal(QUERY_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(QUERY_EVENT_TYPES.size, expected.length);
});

test("isQueryEventType positives", () => {
  assert.equal(isQueryEventType("query.requested"), true);
  assert.equal(isQueryEventType("query.response"), true);
  assert.equal(isQueryEventType("query.rejected"), true);
  assert.equal(isQueryEventType("query.error"), true);
});

test("isQueryEventType negatives", () => {
  assert.equal(isQueryEventType("task.submitted"), false);
  assert.equal(isQueryEventType("session.opened"), false);
  assert.equal(isQueryEventType("command.requested"), false);
  assert.equal(isQueryEventType(""), false);
});
