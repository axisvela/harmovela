import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { SseServerTransport } from "@axisrobo/harmovela-event";

test("SSE server starts and serves text/event-stream", async () => {
  const server = new SseServerTransport({ port: 0, heartbeatInterval: 0 });
  await server.start();

  await new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${server.port}/aep/events`, {
      headers: { Accept: "text/event-stream" }
    }, (res) => {
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers["content-type"].includes("text/event-stream"));

      let data = "";
      res.on("data", (chunk) => {
        data += chunk.toString();
        if (data.includes("\n\n")) {
          req.destroy();
          resolve(data);
        }
      });

      server.send({ spec_version: "0.2", id: "sse_01", type: "task.progress", source: "server", created_at: new Date().toISOString(), payload: {} });
    });
    req.on("error", reject);
    setTimeout(() => { req.destroy(); resolve(""); }, 1000);
  });

  await server.stop();
});

test("SSE ingest endpoint accepts POST events", async () => {
  const server = new SseServerTransport({ port: 0, heartbeatInterval: 0 });
  const serverMessages = [];
  server.on("message", (event) => serverMessages.push(event));
  await server.start();

  const event = JSON.stringify({ spec_version: "0.2", id: "ingest_01", type: "memory.fact.added", source: "client", created_at: new Date().toISOString(), payload: {} });
  const ac = new AbortController();
  const response = await fetch(`http://127.0.0.1:${server.port}/aep/events`, {
    method: "POST",
    headers: { "Content-Type": "application/x-ndjson" },
    body: event,
    signal: ac.signal
  });

  const result = await response.json();
  ac.abort();
  assert.equal(response.status, 202);
  assert.equal(result.accepted, 1);
  assert.equal(serverMessages.length, 1);

  await server.stop();
});

test("SSE ingest rejects invalid JSON gracefully", async () => {
  const server = new SseServerTransport({ port: 0 });
  await server.start();

  const ac = new AbortController();
  const response = await fetch(`http://127.0.0.1:${server.port}/aep/events`, {
    method: "POST",
    headers: { "Content-Type": "application/x-ndjson" },
    body: "not json\n",
    signal: ac.signal
  });

  const result = await response.json();
  ac.abort();
  assert.equal(result.accepted, 0);
  assert.equal(result.rejected, 1);

  await server.stop();
});

test("SSE client sends events via POST to ingest endpoint", async () => {
  const server = new SseServerTransport({ port: 0, heartbeatInterval: 0 });
  const serverMessages = [];
  server.on("message", (event) => serverMessages.push(event));
  await server.start();

  const ac = new AbortController();
  const body = JSON.stringify({ spec_version: "0.2", id: "post_01", type: "task.submitted", source: "agent:test", created_at: new Date().toISOString(), payload: {} });
  const response = await fetch(`http://127.0.0.1:${server.port}/aep/events`, {
    method: "POST",
    headers: { "Content-Type": "application/x-ndjson" },
    body,
    signal: ac.signal
  });

  const result = await response.json();
  ac.abort();
  assert.equal(result.accepted, 1);
  assert.equal(serverMessages[0].type, "task.submitted");

  await server.stop();
});
