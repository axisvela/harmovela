import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { validateEnvelope } from "../src/index.js";
import { isValidBySchema } from "../src/schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const conformanceDir = resolve(here, "../../../conformance");
const manifest = JSON.parse(readFileSync(resolve(conformanceDir, "manifest.json"), "utf8"));

test("conformance manifest declares known draft levels", () => {
  assert.deepEqual(manifest.levels, ["AEP-C0", "AEP-C1", "AEP-C2", "AEP-C3"]);
  assert.equal(manifest.default_target_level, "AEP-C3");
});

for (const fixture of manifest.fixtures) {
  test(`${fixture.level} ${fixture.path} contains valid envelopes`, () => {
    const events = readNdjson(resolve(conformanceDir, fixture.path));

    assert.deepEqual(events.map((event) => event.type), fixture.expected_types);
    assert.deepEqual(events.flatMap((event) => validateEnvelope(event)), []);
    assert.equal(events.every((event) => isValidBySchema(event, "envelope")), true);
  });
}

function readNdjson(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
