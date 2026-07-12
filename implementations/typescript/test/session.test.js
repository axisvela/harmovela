import assert from "node:assert/strict";
import test from "node:test";
import { AepSession } from "../src/index.js";

test("session lifecycle transitions: opened -> ready -> close", () => {
  const session = new AepSession({ id: "sess_test", heartbeatIntervalMs: 0 });

  const opened = session.opened();
  assert.equal(opened.type, "session.opened");
  assert.equal(opened.payload.session_id, "sess_test");
  assert.equal(session.isOpen(), true);
  assert.equal(session.isActive(), false);

  const ready = session.ready({ protocol: "aep", version: "0.1" });
  assert.equal(ready.type, "session.ready");
  assert.equal(ready.payload.capabilities.protocol, "aep");
  assert.equal(session.isActive(), true);

  const closed = session.close();
  assert.equal(closed.type, "session.closed");
  assert.equal(session.isTerminal(), true);
});

test("session error produces error event with standard payload", () => {
  const session = new AepSession({ id: "sess_err" });
  session.opened();
  session.ready();

  const errEvent = session.error("internal_error", "something went wrong");
  assert.equal(errEvent.type, "session.error");
  assert.equal(errEvent.payload.error.code, "internal_error");
  assert.equal(session.isTerminal(), true);
});

test("session rejects invalid state transitions", () => {
  const session = new AepSession({ id: "sess_bad", heartbeatIntervalMs: 0 });
  session.opened();
  session.ready();
  session.close();

  assert.throws(() => session.opened(), /cannot open session/i);
  assert.throws(() => session.ready(), /cannot mark session ready/i);
});

test("session heartbeat returns null when not ready", () => {
  const session = new AepSession({ id: "sess_hb", heartbeatIntervalMs: 0 });
  assert.equal(session.heartbeat(), null);

  session.opened();
  assert.equal(session.heartbeat(), null);

  session.ready();
  const hb = session.heartbeat();
  assert.equal(hb.type, "session.heartbeat");
});
