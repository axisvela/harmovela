import assert from "node:assert/strict";
import test from "node:test";
import { isStandardEventType, validateEnvelope } from "../src/index.js";

test("accepts a valid draft envelope", () => {
  const errors = validateEnvelope({
    aep_version: "0.1",
    id: "evt_01",
    type: "task.progress",
    source: "tool:crawler",
    created_at: "2026-07-09T10:00:00Z",
    payload: { progress: 0.5 }
  });

  assert.deepEqual(errors, []);
});

test("rejects missing required envelope fields", () => {
  const errors = validateEnvelope({
    type: "task.progress",
    payload: {}
  });

  assert.match(errors.join("\n"), /aep_version/);
  assert.match(errors.join("\n"), /id/);
  assert.match(errors.join("\n"), /source/);
  assert.match(errors.join("\n"), /created_at/);
});

test("rejects event types outside the draft registry", () => {
  const errors = validateEnvelope({
    aep_version: "0.1",
    id: "evt_01",
    type: "custom.event.created",
    source: "agent:test",
    created_at: "2026-07-09T10:00:00Z",
    payload: {}
  });

  assert.equal(isStandardEventType("custom.event.created"), false);
  assert.match(errors.join("\n"), /standard draft registry/);
});
