import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { defaultConfig } from "../src/runtime/config.js";
import { SqliteDeliveryStore } from "../src/delivery-store-sqlite.js";

const cli = path.resolve("src/cli/aep.js");

function run(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd: path.resolve("."), ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("aep init writes config", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aep-cli-"));
  const file = path.join(dir, "aep.config.json");
  const result = await run(["init", "--config", file]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /created/);
  const config = JSON.parse(await readFile(file, "utf8"));
  assert.equal(config.runtime.id, "aepd-local");
  await rm(dir, { recursive: true, force: true });
});

test("aep unknown command exits non-zero", async () => {
  const result = await run(["unknown"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /unknown command/);
});

test("aep emit rejects invalid JSON payload", async () => {
  const result = await run(["emit", "task.submitted", "--payload", "{"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /invalid JSON payload/);
});

test("aep conformance runs conformance command", async () => {
  const result = await run(["conformance", "--level=AEP-C0"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /AEP conformance target/);
});

test("aep dlq list outputs dead-lettered records", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aep-cli-dlq-"));
  const dbPath = path.join(dir, "aep.sqlite");
  const configPath = path.join(dir, "aep.config.json");
  const store = new SqliteDeliveryStore(dbPath);
  store.track("evt_dlq", "sub_01");
  store.deadLetter("evt_dlq", { error: { code: "timeout" } });
  store.close();
  const config = defaultConfig();
  config.delivery.store = "sqlite";
  config.delivery.sqlite.path = dbPath;
  await writeFile(configPath, JSON.stringify(config), "utf8");

  const result = await run(["dlq", "list", "--config", configPath]);
  assert.equal(result.code, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.deadLettered, 1);
  assert.equal(output.records[0].eventId, "evt_dlq");
  assert.equal(output.records[0].reason.error.code, "timeout");
  await rm(dir, { recursive: true, force: true });
});
