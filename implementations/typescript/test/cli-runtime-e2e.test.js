import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { WebSocket } from "ws";
import { defaultConfig } from "@axisrobo/harmovela-runtime";

const cli = path.resolve("packages/cli/src/harmovela.js");
const harmovelad = path.resolve("packages/runtime/src/server.js");

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd: path.resolve(".") });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("aep emit delivers event through running aepd websocket runtime", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "harmovela-e2e-"));
  const configPath = path.join(dir, "harmovela.config.json");
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.port = 18987;
  config.transports.sse.enabled = false;
  config.transports.api.enabled = false;
  await writeFile(configPath, JSON.stringify(config), "utf8");

  const daemon = spawn(process.execPath, [harmovelad], {
    cwd: path.resolve("."),
    env: { ...process.env, HARMOVELA_CONFIG: configPath }
  });

  try {
    await waitForOutput(daemon.stdout, /harmovelad started/);
    const ws = new WebSocket("ws://127.0.0.1:18987/harmovela", ["harmovela-0.2"]);
    await once(ws, "open");
    const received = once(ws, "message");
    const emitted = await runCli([
      "emit",
      "task.submitted",
      "--url",
      "ws://127.0.0.1:18987/harmovela",
      "--id",
      "evt_cli_e2e",
      "--payload",
      "{\"task_id\":\"task_01\"}"
    ]);
    assert.equal(emitted.code, 0, emitted.stderr);
    const [data] = await received;
    const event = JSON.parse(data.toString());
    assert.equal(event.id, "evt_cli_e2e");
    assert.equal(event.payload.task_id, "task_01");
    ws.close();
  } finally {
    daemon.kill("SIGINT");
    await rm(dir, { recursive: true, force: true });
  }
});

test("aep subscribe receives events emitted through running aepd", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "harmovela-e2e-"));
  const configPath = path.join(dir, "harmovela.config.json");
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.port = 18989;
  config.transports.sse.enabled = false;
  config.transports.api.enabled = false;
  await writeFile(configPath, JSON.stringify(config), "utf8");

  const daemon = spawn(process.execPath, [harmovelad], {
    cwd: path.resolve("."),
    env: { ...process.env, HARMOVELA_CONFIG: configPath }
  });
  let subscriber;

  try {
    await waitForOutput(daemon.stdout, /harmovelad started/);
    subscriber = spawn(process.execPath, [
      cli,
      "subscribe",
      "--url",
      "ws://127.0.0.1:18989/harmovela",
      "--type",
      "task.*"
    ], { cwd: path.resolve(".") });
    await waitForWebSocketConnection(18989);
    const received = waitForJsonLine(subscriber.stdout, "evt_cli_subscribe_e2e");
    const emitted = await runCli([
      "emit",
      "task.submitted",
      "--url",
      "ws://127.0.0.1:18989/harmovela",
      "--id",
      "evt_cli_subscribe_e2e",
      "--payload",
      "{\"task_id\":\"task_02\"}"
    ]);
    assert.equal(emitted.code, 0, emitted.stderr);
    const event = await received;
    assert.equal(event.id, "evt_cli_subscribe_e2e");
    assert.equal(event.payload.task_id, "task_02");
  } finally {
    subscriber?.kill("SIGINT");
    daemon.kill("SIGINT");
    await rm(dir, { recursive: true, force: true });
  }
});

function waitForOutput(stream, pattern) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${pattern}`)), 5000);
    stream.on("data", (chunk) => {
      if (pattern.test(chunk.toString())) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

function waitForJsonLine(stream, expectedId) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${expectedId}`)), 5000);
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.id === expectedId) {
          clearTimeout(timer);
          resolve(event);
        }
      }
    });
  });
}

async function waitForWebSocketConnection(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/harmovela`, ["harmovela-0.2"]);
  await once(ws, "open");
  ws.close();
}
