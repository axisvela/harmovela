import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { validateEnvelope } from "../src/index.js";
import { isValidBySchema } from "../src/schema.js";
import { runConformance, verifyFixture } from "../src/conformance.js";
import { HarmovelaHarness } from "../src/harness.js";

const here = dirname(fileURLToPath(import.meta.url));
const conformanceDir = resolve(here, "../../../conformance");
const manifest = JSON.parse(readFileSync(resolve(conformanceDir, "manifest.json"), "utf8"));

test("conformance manifest declares Harmovela levels", () => {
  assert.deepEqual(manifest.levels, ["HARMOVELA-C0", "HARMOVELA-C1", "HARMOVELA-C2", "HARMOVELA-C3"]);
  assert.equal(manifest.default_target_level, "HARMOVELA-C3");
});

test("conformance manifest declares Event and Governance contract fixtures", () => {
  assert.deepEqual(
    manifest.fixtures
      .filter((fixture) => ["fixtures/event-contract.ndjson", "fixtures/governance-contract.ndjson"].includes(fixture.path))
      .map(({ path, level, expectation, profile }) => ({ path, level, expectation, profile })),
    [
      { path: "fixtures/event-contract.ndjson", level: "HARMOVELA-C1", expectation: "stateful_flow", profile: undefined },
      { path: "fixtures/governance-contract.ndjson", level: "HARMOVELA-C0", expectation: "reject_some", profile: undefined }
    ]
  );
});

test("governance fixture requires the defined authorization outcomes", () => {
  const events = readNdjson(resolve(conformanceDir, "fixtures/governance-contract.ndjson"));
  assert.deepEqual(events.flatMap((event) => validateEnvelope(event)), []);
  assert.equal(events.every((event) => isValidBySchema(event, "envelope")), true);

  const responses = events.map((event) => new HarmovelaHarness().handle(event));
  assert.deepEqual(
    responses.map((response) => response.some((event) => event.type === "event.rejected")),
    [false, true, true, false]
  );
  for (const response of responses.slice(1, 3)) {
    const rejection = response.find((event) => event.type === "event.rejected");
    assert.equal(rejection?.payload?.error?.code, "unauthorized");
  }
});

test("governance fixture requires audit correlation and causation linkage", () => {
  const events = readNdjson(resolve(conformanceDir, "fixtures/governance-contract.ndjson"));
  const harness = new HarmovelaHarness();
  events.forEach((event) => harness.handle(event));

  assert.equal(Array.isArray(harness.audit), true, "expected governance audit records");
  assert.deepEqual(
    harness.audit.map(({ actor_id, tenant_id, action, target_tenant_id, allowed, correlation_id, causation_id }) => ({
      actor_id,
      tenant_id,
      action,
      target_tenant_id,
      allowed,
      correlation_id,
      causation_id
    })),
    events.map(({ actor_id, tenant_id, requested_action, target_tenant_id, correlation_id, causation_id }, index) => ({
      actor_id,
      tenant_id,
      action: requested_action,
      target_tenant_id,
      allowed: ![1, 2].includes(index),
      correlation_id,
      causation_id
    }))
  );
});

for (const fixture of manifest.fixtures) {
  test(`${fixture.level} ${fixture.path} satisfies ${fixture.expectation}`, () => {
    const events = readNdjson(resolve(conformanceDir, fixture.path));

    if (fixture.expected_types) {
      assert.deepEqual(events.map((event) => event.type), fixture.expected_types);
    }
    if (fixture.expectation === "reject_some") {
      const result = verifyFixture(fixture, events);
      assert.equal(result.status, "passed", result.failures.join("; "));
      return;
    }
    assert.deepEqual(events.flatMap((event) => validateEnvelope(event)), []);
    assert.equal(events.every((event) => isValidBySchema(event, "envelope")), true);
  });
}

test("conformance runner passes C0 negative fixture when invalid envelopes are rejected", () => {
  const { results } = runConformance({ targetLevel: "HARMOVELA-C0" });
  const negative = results.find((result) => result.fixture.path === "fixtures/negative.ndjson");
  assert.equal(negative?.status, "passed", negative?.failures?.join("; "));
});

test("reject_some recognizes envelope-valid invalid payload schemas", () => {
  const fixture = { expectation: "reject_some", expected_types: ["context.invalidated"] };
  const events = [{
    spec_version: "0.2",
    id: "evt_invalid_payload",
    type: "context.invalidated",
    source: "test",
    created_at: "2026-07-12T00:00:00Z",
    payload: {}
  }];

  assert.equal(verifyFixture(fixture, events).status, "passed");
});

test("reject_some recognizes harness protocol rejections", () => {
  const fixture = { expectation: "reject_some", expected_types: ["task.progress"] };
  const events = [{
    spec_version: "0.2",
    id: "evt_unknown_task",
    type: "task.progress",
    source: "test",
    created_at: "2026-07-12T00:00:00Z",
    payload: { task_id: "task_missing" }
  }];

  assert.equal(verifyFixture(fixture, events).status, "passed");
});

function readNdjson(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
