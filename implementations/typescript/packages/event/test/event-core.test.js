import assert from "node:assert/strict";
import test from "node:test";
import {
  EventRouter,
  HarmovelaSession,
  isStandardEventType,
  matchesType,
  subscriptionMatches,
  validateEnvelope
} from "../src/index.js";

test("Event public API validates Event envelopes and excludes Task registry types", () => {
  const event = {
    spec_version: "0.2",
    id: "evt_01",
    type: "session.opened",
    source: "agent:test",
    created_at: "2026-07-09T10:00:00Z",
    payload: {}
  };

  assert.deepEqual(validateEnvelope(event), []);
  assert.equal(isStandardEventType("task.submitted"), false);
});

test("Event public API provides session, subscription, and routing behavior", () => {
  const session = new HarmovelaSession({ id: "sess_event" });
  assert.equal(session.opened().type, "session.opened");
  assert.equal(session.ready().type, "session.ready");
  assert.equal(matchesType("session.*", "session.ready"), true);
  assert.equal(subscriptionMatches({ types: "session.*" }, { type: "session.ready" }), true);

  const router = new EventRouter();
  router.on("session.*", (event) => ({ type: "event.acknowledged", payload: { id: event.id } }));
  assert.equal(router.dispatch({ type: "session.ready", id: "evt_01" }).length, 1);
});
