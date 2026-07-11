import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

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
