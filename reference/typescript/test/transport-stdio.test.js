import assert from "node:assert/strict";
import test from "node:test";
import { MockStdioTransport } from "../src/transport/stdio.js";

test("MockStdioTransport receives and parses NDJSON events", async () => {
  const transport = new MockStdioTransport();
  const received = [];

  transport.on("message", (event) => received.push(event));
  await transport.start();

  transport.feed('{"aep_version":"0.1","id":"evt_01","type":"task.progress","source":"tool:crawler","created_at":"2026-07-09T10:00:00Z","payload":{}}');
  transport.feed("");
  transport.feed('{"aep_version":"0.1","id":"evt_02","type":"task.completed","source":"tool:crawler","created_at":"2026-07-09T10:01:00Z","payload":{}}');

  assert.equal(received.length, 2);
  assert.equal(received[0].type, "task.progress");
  assert.equal(received[1].type, "task.completed");

  await transport.stop();
});

test("MockStdioTransport captures sent data", async () => {
  const transport = new MockStdioTransport();
  await transport.start();

  transport.send(JSON.stringify({ type: "session.opened" }) + "\n");
  transport.send(JSON.stringify({ type: "session.closed" }) + "\n");

  assert.equal(transport.sent.length, 2);
  assert.ok(transport.sent[0].includes("session.opened"));
  assert.ok(transport.sent[1].includes("session.closed"));

  await transport.stop();
});

test("MockStdioTransport ignores empty lines", async () => {
  const transport = new MockStdioTransport();
  const received = [];

  transport.on("message", (event) => received.push(event));
  await transport.start();

  transport.feed("");
  transport.feed("   ");
  transport.feed("");
  transport.feed('{"aep_version":"0.1","id":"evt_03","type":"session.opened","source":"agent:tester","created_at":"2026-07-09T10:00:00Z","payload":{}}');

  assert.equal(received.length, 1);
  assert.equal(received[0].type, "session.opened");

  await transport.stop();
});

test("MockStdioTransport emits error on malformed JSON", async () => {
  const transport = new MockStdioTransport();
  const errors = [];

  transport.on("error", (err) => errors.push(err));
  await transport.start();

  transport.feed("not json");

  assert.equal(errors.length, 1);
  assert.ok(errors[0] instanceof SyntaxError);

  await transport.stop();
});
