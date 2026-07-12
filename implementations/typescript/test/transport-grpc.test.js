import assert from "node:assert/strict";
import test from "node:test";
import { GrpcServerTransport, GrpcClientTransport } from "../src/transport/grpc.js";

test("gRPC server starts and accepts connections", async () => {
  const server = new GrpcServerTransport({ host: "127.0.0.1", port: 0 });
  const connections = [];

  server.on("connection", (info) => connections.push(info));
  server.on("error", () => {});
  await server.start();

  assert.ok(server.port > 0);

  const client = new GrpcClientTransport({ address: `127.0.0.1:${server.port}` });
  client.on("error", () => {});
  await client.start();

  await new Promise((r) => setTimeout(r, 100));

  assert.equal(connections.length, 1);
  assert.ok(connections[0].callId > 0);

  await client.stop();
  await server.stop();
});

test("gRPC client connects and exchanges messages", async () => {
  const server = new GrpcServerTransport({ host: "127.0.0.1", port: 0 });
  const serverMessages = [];
  const clientMessages = [];

  server.on("message", (event) => serverMessages.push(event));
  server.on("error", () => {});
  await server.start();

  const client = new GrpcClientTransport({ address: `127.0.0.1:${server.port}` });
  client.on("message", (event) => clientMessages.push(event));
  client.on("error", () => {});
  await client.start();

  const testEvent = {
    spec_version: "0.2",
    id: "evt_test",
    type: "session.opened",
    source: "client",
    created_at: new Date().toISOString(),
    payload: {}
  };
  client.send(testEvent);

  await new Promise((r) => setTimeout(r, 100));

  assert.equal(serverMessages.length, 1);
  assert.equal(serverMessages[0].type, "session.opened");

  const responseEvent = {
    spec_version: "0.2",
    id: "evt_resp",
    type: "session.ready",
    source: "server",
    created_at: new Date().toISOString(),
    payload: {}
  };
  server.send(responseEvent);

  await new Promise((r) => setTimeout(r, 100));

  assert.equal(clientMessages.length, 1);
  assert.equal(clientMessages[0].type, "session.ready");

  await client.stop();
  await server.stop();
});

test("gRPC bidirectional streaming", async () => {
  const server = new GrpcServerTransport({ host: "127.0.0.1", port: 0 });
  const serverMessages = [];
  const clientMessages = [];

  server.on("message", (event) => serverMessages.push(event));
  server.on("error", () => {});
  await server.start();

  const client = new GrpcClientTransport({ address: `127.0.0.1:${server.port}` });
  client.on("message", (event) => clientMessages.push(event));
  client.on("error", () => {});
  await client.start();

  for (let i = 0; i < 3; i++) {
    client.send({
      spec_version: "0.2",
      id: `client_${i}`,
      type: "test.client",
      source: "client",
      created_at: new Date().toISOString(),
      payload: { seq: i }
    });
  }

  await new Promise((r) => setTimeout(r, 100));

  assert.equal(serverMessages.length, 3);
  for (let i = 0; i < 3; i++) {
    assert.equal(serverMessages[i].payload.seq, i);
  }

  for (let i = 0; i < 3; i++) {
    server.send({
      spec_version: "0.2",
      id: `server_${i}`,
      type: "test.server",
      source: "server",
      created_at: new Date().toISOString(),
      payload: { seq: i }
    });
  }

  await new Promise((r) => setTimeout(r, 100));

  assert.equal(clientMessages.length, 3);
  for (let i = 0; i < 3; i++) {
    assert.equal(clientMessages[i].payload.seq, i);
  }

  await client.stop();
  await server.stop();
});

test("gRPC server shutdown stops cleanly", async () => {
  const server = new GrpcServerTransport({ host: "127.0.0.1", port: 0 });
  server.on("error", () => {});
  await server.start();

  const client = new GrpcClientTransport({ address: `127.0.0.1:${server.port}` });
  client.on("error", () => {});
  await client.start();

  let closed = false;
  client.on("close", () => { closed = true; });

  await server.stop();

  await new Promise((r) => setTimeout(r, 500));

  assert.equal(closed, true);
  await client.stop();
});

test("gRPC server can handle multiple clients", async () => {
  const server = new GrpcServerTransport({ host: "127.0.0.1", port: 0 });
  const serverMessages = [];
  server.on("message", (event) => serverMessages.push(event));
  server.on("error", () => {});
  await server.start();

  const client1 = new GrpcClientTransport({ address: `127.0.0.1:${server.port}` });
  const client2 = new GrpcClientTransport({ address: `127.0.0.1:${server.port}` });
  client1.on("error", () => {});
  client2.on("error", () => {});

  await client1.start();
  await client2.start();

  await new Promise((r) => setTimeout(r, 100));

  client1.send({
    spec_version: "0.2",
    id: "c1_01",
    type: "test.client1",
    source: "client1",
    created_at: new Date().toISOString(),
    payload: {}
  });
  client2.send({
    spec_version: "0.2",
    id: "c2_01",
    type: "test.client2",
    source: "client2",
    created_at: new Date().toISOString(),
    payload: {}
  });

  await new Promise((r) => setTimeout(r, 100));

  const c1Events = serverMessages.filter(e => e.source === "client1");
  const c2Events = serverMessages.filter(e => e.source === "client2");

  assert.equal(c1Events.length, 1);
  assert.equal(c2Events.length, 1);

  await client1.stop();
  await client2.stop();
  await server.stop();
});
