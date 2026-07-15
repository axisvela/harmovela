import assert from "node:assert/strict";
import test from "node:test";
import { CAPABILITY_EVENT_TYPES, isCapabilityEventType } from "../src/index.js";

test("capability event types includes all 5 registry entries", () => {
  const expected = [
    "capability.registered",
    "capability.updated",
    "capability.deprecated",
    "capability.composed",
    "capability.validated"
  ];
  for (const type of expected) {
    assert.equal(CAPABILITY_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(CAPABILITY_EVENT_TYPES.size, expected.length);
});

test("isCapabilityEventType positives", () => {
  assert.equal(isCapabilityEventType("capability.registered"), true);
  assert.equal(isCapabilityEventType("capability.updated"), true);
  assert.equal(isCapabilityEventType("capability.deprecated"), true);
  assert.equal(isCapabilityEventType("capability.composed"), true);
  assert.equal(isCapabilityEventType("capability.validated"), true);
});

test("isCapabilityEventType negatives", () => {
  assert.equal(isCapabilityEventType("capabilities.requested"), false);
  assert.equal(isCapabilityEventType("task.submitted"), false);
  assert.equal(isCapabilityEventType("command.requested"), false);
  assert.equal(isCapabilityEventType(""), false);
});
