import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { WebSocket } from "ws";
import { defaultConfig } from "../src/runtime/config.js";

const cli = path.resolve("src/cli/aep.js");
const aepd = path.resolve("src/runtime/server.js");

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
  const dir = await mkdtemp(path.join(tmpdir(), "aep-e2e-"));
  const configPath = path.join(dir, "aep.config.json");
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.port = 18987;
  config.transports.sse.enabled = false;
  await writeFile(configPath, JSON.stringify(config), "utf8");

  const daemon = spawn(process.execPath, [aepd], {
    cwd: path.resolve("."),
    env: { ...process.env, AEP_CONFIG: configPath }
  });

  try {
    await waitForOutput(daemon.stdout, /aepd started/);
    const ws = new WebSocket("ws://127.0.0.1:18987/aep", ["aep-0.1"]);
    await once(ws, "open");
    const received = once(ws, "message");
    const emitted = await runCli([
      "emit",
      "task.submitted",
      "--url",
      "ws://127.0.0.1:18987/aep",
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
