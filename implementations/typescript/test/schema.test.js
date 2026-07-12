import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateEnvelopeSchema, validateSubscriptionSchema, isValidBySchema, AepHarness } from "../src/index.js";
import { validateEnvelope } from "../src/validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, "../../../conformance/fixtures");

function readNdjson(path) {
  return readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

test("all conformance fixtures pass JSON Schema envelope validation", () => {
  for (const fixture of ["task-lifecycle", "memory-context-ack", "session-flow"]) {
    const events = readNdjson(resolve(fixturesDir, `${fixture}.ndjson`));
    for (const event of events) {
      assert.equal(isValidBySchema(event, "envelope"), true, `${event.type} in ${fixture} should pass schema`);
    }
  }
});

test("envelope schema rejects missing required fields", () => {
  const errors = validateEnvelopeSchema({ type: "task.progress", payload: {} });
  assert.ok(errors.length > 0);
});

test("runtime validation and schema validation agree on valid events", () => {
  const events = readNdjson(resolve(fixturesDir, "task-lifecycle.ndjson"));
  for (const event of events) {
    const runtimeErrors = validateEnvelope(event);
    const schemaValid = isValidBySchema(event, "envelope");
    assert.equal(runtimeErrors.length, 0);
    assert.equal(schemaValid, true);
  }
});

test("schema validation catches invalid delivery mode", () => {
  const event = {
    aep_version: "0.1", id: "evt_01", type: "task.progress",
    source: "tool:crawler", created_at: "2026-07-09T10:00:00Z", payload: {},
    delivery: { mode: "exactly_once" }
  };
  assert.equal(isValidBySchema(event, "envelope"), false);
});

test("subscription filter schema validates valid filter", () => {
  assert.equal(isValidBySchema({
    types: ["memory.*", "context.*"],
    source: "memory:main",
    target: "agent:researcher",
    delivery_mode: "at_least_once"
  }, "subscription"), true);
});

test("subscription filter schema rejects invalid delivery_mode", () => {
  assert.equal(isValidBySchema({
    types: ["memory.*"],
    delivery_mode: "invalid"
  }, "subscription"), false);
});

test("harness with schema validation rejects schema-invalid envelope", () => {
  const h = new AepHarness({ useSchemaValidation: true, now: () => "2026-07-09T10:00:01Z" });
  const [resp] = h.handle({
    aep_version: "0.1", id: "evt_01", type: "task.progress",
    source: "tool:crawler", created_at: "2026-07-09T10:00:00Z", payload: {},
    delivery: { mode: "invalid_mode" }
  });
  assert.equal(resp.type, "event.rejected");
  assert.equal(resp.payload.error.code, "invalid_envelope");
});

test("harness with schema validation accepts valid events", () => {
  const h = new AepHarness({ useSchemaValidation: true, now: () => "2026-07-09T10:00:01Z" });
  const [resp] = h.handle({
    aep_version: "0.1", id: "evt_valid", type: "task.progress",
    source: "tool:crawler", created_at: "2026-07-09T10:00:00Z", payload: {},
    delivery: { mode: "best_effort", sequence: 1, cursor: "stream:1" }
  });
  assert.equal(resp.type, "event.acknowledged");
});
