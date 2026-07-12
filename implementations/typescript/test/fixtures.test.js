import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { validateEnvelope } from "../src/index.js";
import { isValidBySchema } from "../src/schema.js";
import { runConformance } from "../src/conformance.js";

const here = dirname(fileURLToPath(import.meta.url));
const conformanceDir = resolve(here, "../../../conformance");
const manifest = JSON.parse(readFileSync(resolve(conformanceDir, "manifest.json"), "utf8"));

test("conformance manifest declares Harmovela levels", () => {
  assert.deepEqual(manifest.levels, ["HARMOVELA-C0", "HARMOVELA-C1", "HARMOVELA-C2", "HARMOVELA-C3"]);
  assert.equal(manifest.default_target_level, "HARMOVELA-C3");
});

for (const fixture of manifest.fixtures) {
  test(`${fixture.level} ${fixture.path} satisfies ${fixture.expectation}`, () => {
    const events = readNdjson(resolve(conformanceDir, fixture.path));

    if (fixture.expected_types) {
      assert.deepEqual(events.map((event) => event.type), fixture.expected_types);
    }
    if (fixture.expectation === "reject_some") {
      assert.equal(events.some((event) =>
        validateEnvelope(event).length > 0 || !isValidBySchema(event, "envelope")
      ), true);
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

function readNdjson(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
