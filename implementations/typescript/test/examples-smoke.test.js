import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { defaultConfig } from "../src/runtime/config.js";

const repoRoot = path.resolve("..", "..");

function runNode(scriptRelPath, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(repoRoot, scriptRelPath), ...args], { cwd: repoRoot });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("sdk runtime-embed example publishes and receives an event", async () => {
  const result = await runNode("examples/quickstart/runtime-embed.js");
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /received task.submitted evt_embed/);
});

test("service http-api-client example round-trips through aepd", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aep-ex-"));
  const configPath = path.join(dir, "aep.config.json");
  const config = defaultConfig();
  config.delivery.store = "memory";
  config.transports.websocket.enabled = false;
  config.transports.sse.enabled = false;
  config.transports.api = { enabled: true, host: "127.0.0.1", port: 8795, path: "/aep/api" };
  await writeFile(configPath, JSON.stringify(config), "utf8");

  const aepd = path.join(repoRoot, "implementations", "typescript", "src", "runtime", "server.js");
  const daemon = spawn(process.execPath, [aepd], { cwd: repoRoot, env: { ...process.env, AEP_CONFIG: configPath } });
  try {
    await waitFor(daemon.stdout, /aepd started/);
    const result = await runNode("examples/service-client/http-subscribe.js", ["--base", "http://127.0.0.1:8795/aep/api"]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /received evt_http/);
  } finally {
    daemon.kill("SIGINT");
    await rm(dir, { recursive: true, force: true });
  }
});

function waitFor(stream, pattern) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${pattern}`)), 5000);
    stream.on("data", (chunk) => {
      if (pattern.test(chunk.toString())) { clearTimeout(timer); resolve(); }
    });
  });
}
