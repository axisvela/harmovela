import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_EVENT_TYPES, isAgentEventType } from "../src/index.js";

test("agent event types includes all 6 registry entries", () => {
  const expected = [
    "agent.message.sent",
    "agent.message.received",
    "agent.message.failed",
    "agent.request.created",
    "agent.response.created",
    "agent.decision.recorded"
  ];
  for (const type of expected) {
    assert.equal(AGENT_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(AGENT_EVENT_TYPES.size, expected.length);
});

test("isAgentEventType positives", () => {
  assert.equal(isAgentEventType("agent.message.sent"), true);
  assert.equal(isAgentEventType("agent.message.received"), true);
  assert.equal(isAgentEventType("agent.message.failed"), true);
  assert.equal(isAgentEventType("agent.request.created"), true);
  assert.equal(isAgentEventType("agent.response.created"), true);
  assert.equal(isAgentEventType("agent.decision.recorded"), true);
});

test("isAgentEventType negatives", () => {
  assert.equal(isAgentEventType("task.submitted"), false);
  assert.equal(isAgentEventType("session.opened"), false);
  assert.equal(isAgentEventType("context.updated"), false);
  assert.equal(isAgentEventType(""), false);
});
