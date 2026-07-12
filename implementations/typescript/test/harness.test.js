import assert from "node:assert/strict";
import test from "node:test";
import { AepHarness } from "../src/index.js";

const now = () => "2026-07-09T10:00:01Z";

const validBase = {
  aep_version: "0.1",
  id: "evt_input_01",
  source: "agent:tester",
  created_at: "2026-07-09T10:00:00Z"
};

test("declares harness capabilities", () => {
  const harness = new AepHarness({ now });
  const [response] = harness.handle({
    ...validBase,
    type: "capabilities.requested",
    payload: {}
  });

  assert.equal(response.type, "capabilities.declared");
  assert.equal(response.causation_id, "evt_input_01");
  assert.ok(response.payload.features.includes("task_lifecycle"));
  assert.ok(response.payload.features.includes("session_lifecycle"));
  assert.ok(response.payload.features.includes("error_model"));
});

test("creates subscriptions", () => {
  const harness = new AepHarness({ now });
  const [response] = harness.handle({
    ...validBase,
    type: "subscription.requested",
    payload: { types: ["memory.*"], target: "agent:tester" }
  });

  assert.equal(response.type, "subscription.created");
  assert.equal(harness.subscriptions.size, 1);
});

test("rejects subscription with no filter criteria", () => {
  const harness = new AepHarness({ now });
  const [response] = harness.handle({
    ...validBase,
    type: "subscription.requested",
    payload: { delivery_mode: "best_effort" }
  });

  assert.equal(response.type, "subscription.rejected");
  assert.equal(response.payload.error.code, "subscription_rejected");
});

test("manages session opening and ready", () => {
  const harness = new AepHarness({ now });
  const responses = harness.handle({
    ...validBase,
    type: "session.opened",
    session_id: "sess_test",
    payload: { session_id: "sess_test", version: "0.1" }
  });

  assert.equal(responses.length, 1);
  assert.equal(responses[0].type, "session.ready");
  assert.equal(harness.session.isActive(), true);
});

test("closes active session", () => {
  const harness = new AepHarness({ now });
  harness.handle({
    ...validBase,
    type: "session.opened",
    session_id: "sess_close",
    payload: { session_id: "sess_close", version: "0.1" }
  });

  const responses = harness.handle({
    ...validBase,
    type: "session.closed",
    session_id: "sess_close",
    payload: { session_id: "sess_close", reason: "done" }
  });

  assert.equal(harness.session.isTerminal(), true);
  const closedEvents = responses.filter((r) => r.type === "session.closed");
  assert.equal(closedEvents.length, 1);
});

test("rejects duplicate session open", () => {
  const harness = new AepHarness({ now });
  harness.handle({
    ...validBase,
    type: "session.opened",
    session_id: "sess_dup",
    payload: { session_id: "sess_dup", version: "0.1" }
  });

  const [response] = harness.handle({
    ...validBase,
    type: "session.opened",
    session_id: "sess_dup",
    payload: { session_id: "sess_dup", version: "0.1" }
  });

  assert.equal(response.type, "event.rejected");
  assert.equal(response.payload.error.code, "session_error");
});

test("accepts task submission and tracks lifecycle", () => {
  const harness = new AepHarness({ now });
  const [accepted] = harness.handle({
    ...validBase,
    type: "task.submitted",
    task_id: "task_lc_01",
    payload: { description: "index docs" }
  });

  assert.equal(accepted.type, "task.accepted");
  assert.equal(harness.tasks.size, 1);
  assert.equal(harness.tasks.get("task_lc_01").state, "accepted");

  const responses = harness.handle({
    ...validBase,
    id: "evt_input_02",
    type: "task.started",
    task_id: "task_lc_01",
    payload: {}
  });

  const taskEvent = responses.find((r) => r.type === "task.started");
  assert.ok(taskEvent);
  assert.equal(harness.tasks.get("task_lc_01").state, "started");
});

test("removes task on completion", () => {
  const harness = new AepHarness({ now });
  harness.handle({
    ...validBase,
    type: "task.submitted",
    task_id: "task_done",
    payload: { description: "short task" }
  });

  harness.handle({
    ...validBase,
    id: "evt_input_03",
    type: "task.started",
    task_id: "task_done",
    payload: {}
  });

  harness.handle({
    ...validBase,
    id: "evt_input_04",
    type: "task.completed",
    task_id: "task_done",
    payload: { result: "ok" }
  });

  assert.equal(harness.tasks.size, 0);
});

test("rejects task events for unknown task", () => {
  const harness = new AepHarness({ now });
  const [response] = harness.handle({
    ...validBase,
    type: "task.progress",
    task_id: "task_ghost",
    payload: { progress: 0.5 }
  });

  assert.equal(response.type, "event.rejected");
  assert.equal(response.payload.error.code, "task_error");
});

test("acknowledges valid non-control events", () => {
  const harness = new AepHarness({ now });
  const [response] = harness.handle({
    ...validBase,
    type: "task.progress",
    payload: { progress: 0.25 }
  });

  assert.equal(response.type, "event.acknowledged");
  assert.equal(response.payload.acknowledged_event_id, "evt_input_01");
});

test("rejects invalid envelopes with standard error", () => {
  const harness = new AepHarness({ now });
  const [response] = harness.handle({ type: "unknown.event", payload: {} });

  assert.equal(response.type, "event.rejected");
  assert.equal(response.payload.errors.length, 5);
  assert.equal(response.payload.error.code, "invalid_envelope");
});

test("rejects unsupported protocol versions", () => {
  const harness = new AepHarness({ now });
  const [response] = harness.handle({
    ...validBase,
    aep_version: "9.9",
    type: "task.progress",
    payload: {}
  });

  assert.equal(response.type, "event.rejected");
  assert.equal(response.payload.error.code, "unsupported_version");
});
