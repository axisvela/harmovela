import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";

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
  const result = await runNode("examples/sdk/runtime-embed.js");
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /received task.submitted evt_embed/);
});
