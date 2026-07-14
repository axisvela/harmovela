import assert from "node:assert/strict";
import test from "node:test";
import { DELEGATION_EVENT_TYPES, isDelegationEventType } from "../src/index.js";

test("delegation event types includes all 5 registry entries", () => {
  const expected = [
    "delegation.requested",
    "delegation.accepted",
    "delegation.rejected",
    "delegation.handoff.completed",
    "delegation.escalated"
  ];
  for (const type of expected) {
    assert.equal(DELEGATION_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(DELEGATION_EVENT_TYPES.size, expected.length);
});

test("isDelegationEventType positives", () => {
  assert.equal(isDelegationEventType("delegation.requested"), true);
  assert.equal(isDelegationEventType("delegation.accepted"), true);
  assert.equal(isDelegationEventType("delegation.handoff.completed"), true);
  assert.equal(isDelegationEventType("delegation.escalated"), true);
});

test("isDelegationEventType negatives", () => {
  assert.equal(isDelegationEventType("task.submitted"), false);
  assert.equal(isDelegationEventType("session.opened"), false);
  assert.equal(isDelegationEventType("context.updated"), false);
  assert.equal(isDelegationEventType(""), false);
});
