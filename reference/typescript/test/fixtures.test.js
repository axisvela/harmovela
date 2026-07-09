import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { validateEnvelope } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const conformanceDir = resolve(here, "../../../conformance/fixtures");

test("shared task lifecycle fixture contains valid envelopes", () => {
  const events = readNdjson(resolve(conformanceDir, "task-lifecycle.ndjson"));

  assert.equal(events.length, 3);
  assert.deepEqual(events.map((event) => event.type), ["task.submitted", "task.progress", "task.completed"]);
  assert.deepEqual(events.flatMap((event) => validateEnvelope(event)), []);
});

test("shared memory/context/ack fixture contains valid envelopes", () => {
  const events = readNdjson(resolve(conformanceDir, "memory-context-ack.ndjson"));

  assert.equal(events.length, 4);
  assert.deepEqual(events.map((event) => event.type), [
    "subscription.requested",
    "memory.fact.added",
    "context.invalidated",
    "event.acknowledged"
  ]);
  assert.deepEqual(events.flatMap((event) => validateEnvelope(event)), []);
});

test("shared delivery fixture contains valid envelopes", () => {
  const events = readNdjson(resolve(conformanceDir, "delivery.ndjson"));

  assert.equal(events.length, 5);
  assert.deepEqual(events.map((event) => event.type), [
    "task.submitted",
    "task.progress",
    "event.acknowledged",
    "event.redelivered",
    "event.dead_lettered"
  ]);
  assert.deepEqual(events.flatMap((event) => validateEnvelope(event)), []);
});

function readNdjson(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}
