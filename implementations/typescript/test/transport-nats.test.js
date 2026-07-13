import assert from "node:assert/strict";
import test from "node:test";
import { NatsTransport } from "@axisrobo/harmovela-event";

test("NatsTransport _eventSubject routes by topic first", () => {
  const t = new NatsTransport({ prefix: "aep" });
  const subject = t._eventSubject({ topic: "tasks.task_01", type: "task.progress", source: "agent:x" });
  assert.equal(subject, "aep.topic.tasks.task_01");
});

test("NatsTransport _eventSubject routes by type when no topic", () => {
  const t = new NatsTransport({ prefix: "aep" });
  assert.equal(t._eventSubject({ type: "task.progress" }), "aep.type.task.progress");
});

test("NatsTransport _eventSubject routes by source when no topic or type", () => {
  const t = new NatsTransport({ prefix: "aep" });
  assert.equal(t._eventSubject({ source: "agent:researcher" }), "aep.source.agent:researcher");
});

test("NatsTransport _eventSubject fallback", () => {
  const t = new NatsTransport({ prefix: "aep" });
  assert.equal(t._eventSubject({}), "aep.event");
});

test("NatsTransport subscriptionSubjects maps patterns", () => {
  const t = new NatsTransport({ prefix: "aep" });
  const subjects = t.subscriptionSubjects(["task.*", "memory.*"], "sess_01");
  assert.deepEqual(subjects, ["aep.type.task.>", "aep.type.memory.>", "aep.sess.sess_01"]);
});

test("NatsTransport subscriptionSubjects wildcard all", () => {
  const t = new NatsTransport({ prefix: "aep" });
  const subjects = t.subscriptionSubjects(["*"], "");
  assert.deepEqual(subjects, ["aep.>"]);
});

test("NatsTransport constructor defaults", () => {
  const t = new NatsTransport();
  assert.equal(t._url, "nats://localhost:4222");
  assert.equal(t._prefix, "aep");
  assert.equal(t.connected, false);
});

test("NatsTransport _onSend throws when not connected", () => {
  const t = new NatsTransport();
  assert.throws(() => t._onSend({ type: "test" }), /not connected/);
});

test("NatsTransport custom prefix", () => {
  const t = new NatsTransport({ prefix: "custom" });
  assert.equal(t._eventSubject({ type: "test" }), "custom.type.test");
});
