import assert from "node:assert/strict";
import test from "node:test";
import { RECOVERY_EVENT_TYPES, isRecoveryEventType } from "@axisrobo/harmovela-recovery";

test("recovery event types includes all 7 registry entries", () => {
  const expected = [
    "interruption.requested",
    "interruption.acknowledged",
    "interruption.saved",
    "interruption.resumed",
    "interruption.cancelled",
    "compensation.requested",
    "compensation.completed"
  ];
  for (const type of expected) {
    assert.equal(RECOVERY_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(RECOVERY_EVENT_TYPES.size, expected.length);
});

test("isRecoveryEventType positives", () => {
  assert.equal(isRecoveryEventType("interruption.requested"), true);
  assert.equal(isRecoveryEventType("interruption.acknowledged"), true);
  assert.equal(isRecoveryEventType("interruption.saved"), true);
  assert.equal(isRecoveryEventType("interruption.resumed"), true);
  assert.equal(isRecoveryEventType("interruption.cancelled"), true);
  assert.equal(isRecoveryEventType("compensation.requested"), true);
  assert.equal(isRecoveryEventType("compensation.completed"), true);
});

test("isRecoveryEventType negatives", () => {
  assert.equal(isRecoveryEventType("task.submitted"), false);
  assert.equal(isRecoveryEventType("session.opened"), false);
  assert.equal(isRecoveryEventType("delegation.requested"), false);
  assert.equal(isRecoveryEventType(""), false);
});
