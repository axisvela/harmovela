import assert from "node:assert/strict";
import test from "node:test";
import { RedisTransport } from "@axisrobo/harmovela-event";

test("RedisTransport streamKey routing", () => {
  const t = new RedisTransport({ prefix: "aep" });
  assert.equal(t.streamKey({ type: "task.progress" }), "aep.type.task.progress");
  assert.equal(t.streamKey({ source: "sensor:a" }), "aep.source.sensor:a");
  assert.equal(t.streamKey({}), "aep.events");
});

test("RedisTransport consumerGroup from session", () => {
  const t = new RedisTransport();
  assert.equal(t.consumerGroup({ session_id: "sess_01" }), "aep-sess_01");
  assert.equal(t.consumerGroup({}), "aep-default");
});

test("RedisTransport entryFields maps all fields plus body", () => {
  const t = new RedisTransport();
  const event = {
    type: "task.submitted", source: "agent:researcher",
    session_id: "sess_01", conversation_id: "conv_01",
    task_id: "task_01", correlation_id: "corr_01",
    causation_id: "evt_001", delivery: { mode: "at_least_once" }
  };
  const fields = t.entryFields(event);
  assert.equal(fields["aep-type"], "task.submitted");
  assert.equal(fields["aep-source"], "agent:researcher");
  assert.equal(fields["aep-session"], "sess_01");
  assert.equal(fields["aep-conversation"], "conv_01");
  assert.equal(fields["aep-task"], "task_01");
  assert.equal(fields["aep-correlation"], "corr_01");
  assert.equal(fields["aep-causation"], "evt_001");
  assert.equal(fields["aep-delivery-mode"], "at_least_once");
  assert.equal(JSON.parse(fields.body).task_id, "task_01");
  assert.equal(Object.keys(fields).length, 9);
});

test("RedisTransport constructor defaults", () => {
  const t = new RedisTransport();
  assert.equal(t.addr, "localhost:6379");
  assert.equal(t.stream, "aep.events");
  assert.equal(t.prefix, "aep");
});

test("RedisTransport custom prefix", () => {
  const t = new RedisTransport({ prefix: "custom" });
  assert.equal(t.streamKey({ type: "test" }), "custom.type.test");
});

test("RedisTransport _onSend throws when not started", () => {
  const t = new RedisTransport();
  assert.throws(() => t._onSend({ type: "test" }), /not started/);
});

test("RedisTransport roundtrip JSON", () => {
  const event = { spec_version: "0.2", id: "evt_001", type: "test", source: "test", created_at: "2026-07-10T10:00:00Z", payload: {} };
  const json = JSON.stringify(event);
  const parsed = JSON.parse(json);
  assert.equal(parsed.id, "evt_001");
});
