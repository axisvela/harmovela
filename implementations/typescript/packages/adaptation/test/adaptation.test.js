import test from "node:test";
import assert from "node:assert/strict";
import { ADAPTATION_EVENT_TYPES, isAdaptationEventType } from "../src/index.js";

test("adaptation event types includes all 10 registry entries", () => {
  const expected = [
    "adaptation.outcome.correlated",
    "adaptation.goal.created",
    "adaptation.goal.updated",
    "adaptation.goal.achieved",
    "adaptation.goal.abandoned",
    "adaptation.cost.exceeded",
    "adaptation.budget.established",
    "adaptation.budget.adjusted",
    "adaptation.budget.limit_exceeded",
    "adaptation.budget.exhausted",
  ];
  for (const type of expected) {
    assert.equal(ADAPTATION_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(ADAPTATION_EVENT_TYPES.size, expected.length);
});

test("isAdaptationEventType positives", () => {
  assert.equal(isAdaptationEventType("adaptation.outcome.correlated"), true);
  assert.equal(isAdaptationEventType("adaptation.goal.created"), true);
  assert.equal(isAdaptationEventType("adaptation.goal.updated"), true);
  assert.equal(isAdaptationEventType("adaptation.goal.achieved"), true);
  assert.equal(isAdaptationEventType("adaptation.goal.abandoned"), true);
  assert.equal(isAdaptationEventType("adaptation.cost.exceeded"), true);
  assert.equal(isAdaptationEventType("adaptation.budget.established"), true);
  assert.equal(isAdaptationEventType("adaptation.budget.adjusted"), true);
  assert.equal(isAdaptationEventType("adaptation.budget.limit_exceeded"), true);
  assert.equal(isAdaptationEventType("adaptation.budget.exhausted"), true);
});

test("isAdaptationEventType negatives", () => {
  assert.equal(isAdaptationEventType("task.submitted"), false);
  assert.equal(isAdaptationEventType("session.opened"), false);
  assert.equal(isAdaptationEventType("context.updated"), false);
  assert.equal(isAdaptationEventType(""), false);
});
