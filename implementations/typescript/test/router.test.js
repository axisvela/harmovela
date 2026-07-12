import assert from "node:assert/strict";
import test from "node:test";
import { EventRouter } from "../src/index.js";

const makeEvent = (type, overrides = {}) => ({
  aep_version: "0.1",
  id: "evt_01",
  type,
  source: "agent:test",
  created_at: "2026-07-09T10:00:00Z",
  payload: {},
  ...overrides
});

test("router dispatches to matching handler by type pattern", () => {
  const router = new EventRouter();
  const handled = [];

  router.on("task.*", (event) => { handled.push(event.type); });
  router.dispatch(makeEvent("task.submitted"));
  router.dispatch(makeEvent("task.completed"));
  router.dispatch(makeEvent("memory.fact.added"));

  assert.deepEqual(handled, ["task.submitted", "task.completed"]);
});

test("router collects responses from handlers", () => {
  const router = new EventRouter();
  router.on("task.*", (event) => ({ type: "ack", payload: { id: event.id } }));
  router.on("task.*", (event) => [{ type: "log", payload: { id: event.id } }]);

  const results = router.dispatch(makeEvent("task.progress"));
  assert.equal(results.length, 2);
  assert.equal(results[0].type, "ack");
  assert.equal(results[1].type, "log");
});

test("router matches specific event types", () => {
  const router = new EventRouter();
  const handled = [];

  router.on("task.progress", (event) => handled.push(event.type));
  router.dispatch(makeEvent("task.progress"));
  router.dispatch(makeEvent("task.completed"));

  assert.deepEqual(handled, ["task.progress"]);
});

test("router match-all handler", () => {
  const router = new EventRouter();
  const handled = [];

  router.on((event) => handled.push(event.type));
  router.dispatch(makeEvent("session.opened"));
  router.dispatch(makeEvent("task.failed"));

  assert.deepEqual(handled, ["session.opened", "task.failed"]);
});
