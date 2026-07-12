import assert from "node:assert/strict";
import test from "node:test";
import { WsServerTransport, WsClientTransport } from "../src/transport/websocket.js";

test("WebSocket server starts and accepts connections", async () => {
  const server = new WsServerTransport({ port: 0, host: "127.0.0.1" });
  const connections = [];

  server.on("connection", (info) => connections.push(info));
  await server.start();

  assert.ok(server.port > 0);

  const client = new WsClientTransport({ url: `ws://127.0.0.1:${server.port}/aep` });
  await client.start();

  assert.equal(connections.length, 1);
  assert.ok(connections[0].remoteAddress);

  await client.stop();
  await server.stop();
});

test("WebSocket bidirectional message exchange", async () => {
  const server = new WsServerTransport({ port: 0 });
  const serverMessages = [];
  const clientMessages = [];

  server.on("message", (event) => serverMessages.push(event));
  await server.start();

  const client = new WsClientTransport({ url: `ws://127.0.0.1:${server.port}/aep` });
  client.on("message", (event) => clientMessages.push(event));
  await client.start();

  const testEvent = { aep_version: "0.1", id: "evt_test", type: "session.opened", source: "client", created_at: new Date().toISOString(), payload: {} };
  client.send(testEvent);

  // Wait for message delivery
  await new Promise((r) => setTimeout(r, 100));

  assert.equal(serverMessages.length, 1);
  assert.equal(serverMessages[0].type, "session.opened");

  const responseEvent = { aep_version: "0.1", id: "evt_resp", type: "session.ready", source: "server", created_at: new Date().toISOString(), payload: {} };
  server.send(responseEvent);

  await new Promise((r) => setTimeout(r, 100));

  assert.equal(clientMessages.length, 1);
  assert.equal(clientMessages[0].type, "session.ready");

  await client.stop();
  await server.stop();
});

test("WebSocket server broadcasts to all clients", async () => {
  const server = new WsServerTransport({ port: 0 });
  await server.start();

  const client1 = new WsClientTransport({ url: `ws://127.0.0.1:${server.port}/aep` });
  const client2 = new WsClientTransport({ url: `ws://127.0.0.1:${server.port}/aep` });

  const client1Messages = [];
  const client2Messages = [];

  client1.on("message", (e) => client1Messages.push(e));
  client2.on("message", (e) => client2Messages.push(e));

  await client1.start();
  await client2.start();

  await new Promise((r) => setTimeout(r, 100));

  server.send({ aep_version: "0.1", id: "broadcast_01", type: "memory.fact.added", source: "server", created_at: new Date().toISOString(), payload: { fact: "test" } });

  await new Promise((r) => setTimeout(r, 100));

  assert.equal(client1Messages.length, 1);
  assert.equal(client2Messages.length, 1);

  await client1.stop();
  await client2.stop();
  await server.stop();
});

test("WebSocket client receives close code on server shutdown", async () => {
  const server = new WsServerTransport({ port: 0 });
  await server.start();

  const client = new WsClientTransport({ url: `ws://127.0.0.1:${server.port}/aep` });
  await client.start();

  let closed = false;
  client.on("close", () => { closed = true; });

  await server.stop();

  await new Promise((r) => setTimeout(r, 200));

  assert.equal(closed, true);
  await client.stop();
});
