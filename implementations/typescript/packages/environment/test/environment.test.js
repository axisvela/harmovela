import assert from "node:assert/strict";
import test from "node:test";
import { ENVIRONMENT_EVENT_TYPES, isEnvironmentEventType } from "../src/index.js";

test("environment event types includes all 4 registry entries", () => {
  const expected = [
    "environment.observed",
    "environment.changed",
    "environment.alerted",
    "environment.error"
  ];
  for (const type of expected) {
    assert.equal(ENVIRONMENT_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(ENVIRONMENT_EVENT_TYPES.size, expected.length);
});

test("isEnvironmentEventType positives", () => {
  assert.equal(isEnvironmentEventType("environment.observed"), true);
  assert.equal(isEnvironmentEventType("environment.changed"), true);
  assert.equal(isEnvironmentEventType("environment.alerted"), true);
  assert.equal(isEnvironmentEventType("environment.error"), true);
});

test("isEnvironmentEventType negatives", () => {
  assert.equal(isEnvironmentEventType("task.submitted"), false);
  assert.equal(isEnvironmentEventType("session.opened"), false);
  assert.equal(isEnvironmentEventType("context.updated"), false);
  assert.equal(isEnvironmentEventType(""), false);
});
