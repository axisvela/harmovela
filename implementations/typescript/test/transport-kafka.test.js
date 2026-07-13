import assert from "node:assert/strict";
import test from "node:test";
import { KafkaTransport } from "@axisrobo/harmovela-event";

test("KafkaTransport messageKey priority", () => {
  const t = new KafkaTransport();
  assert.equal(t.messageKey({ task_id: "task_01", conversation_id: "conv_01", session_id: "sess_01", source: "agent:x" }), "task_01");
  assert.equal(t.messageKey({ conversation_id: "conv_01", session_id: "sess_01" }), "conv_01");
  assert.equal(t.messageKey({ session_id: "sess_01" }), "sess_01");
  assert.equal(t.messageKey({ source: "agent:researcher" }), "agent:researcher");
  assert.equal(t.messageKey({}), "");
});

test("KafkaTransport targetTopic routing", () => {
  const t = new KafkaTransport({ prefix: "aep" });
  assert.equal(t.targetTopic({ type: "task.progress" }), "aep.type.task.progress");
  assert.equal(t.targetTopic({ source: "sensor:a" }), "aep.source.sensor:a");
  assert.equal(t.targetTopic({}), "aep.events");
});

test("KafkaTransport messageHeaders maps all fields", () => {
  const t = new KafkaTransport();
  const headers = t.messageHeaders({
    type: "task.submitted", source: "agent:researcher",
    session_id: "sess_01", conversation_id: "conv_01",
    task_id: "task_01", correlation_id: "corr_01",
    causation_id: "evt_001", delivery: { mode: "at_least_once" }
  });
  assert.equal(headers["aep-type"], "task.submitted");
  assert.equal(headers["aep-source"], "agent:researcher");
  assert.equal(headers["aep-session"], "sess_01");
  assert.equal(headers["aep-conversation"], "conv_01");
  assert.equal(headers["aep-task"], "task_01");
  assert.equal(headers["aep-correlation"], "corr_01");
  assert.equal(headers["aep-causation"], "evt_001");
  assert.equal(headers["aep-delivery-mode"], "at_least_once");
  assert.equal(Object.keys(headers).length, 8);
});

test("KafkaTransport constructor defaults", () => {
  const t = new KafkaTransport();
  assert.deepEqual(t.brokers, ["localhost:9092"]);
  assert.equal(t.topic, "aep.events");
  assert.equal(t.prefix, "aep");
});

test("KafkaTransport custom prefix", () => {
  const t = new KafkaTransport({ prefix: "custom" });
  assert.equal(t.targetTopic({ type: "test" }), "custom.type.test");
});

test("KafkaTransport _onSend throws when not started", () => {
  const t = new KafkaTransport();
  assert.throws(() => t._onSend({ type: "test" }), /not started/);
});

test("KafkaTransport roundtrip JSON", () => {
  const event = { spec_version: "0.2", id: "evt_001", type: "test", source: "test", created_at: "2026-07-10T10:00:00Z", payload: {} };
  const json = JSON.stringify(event);
  const parsed = JSON.parse(json);
  assert.equal(parsed.id, "evt_001");
});
