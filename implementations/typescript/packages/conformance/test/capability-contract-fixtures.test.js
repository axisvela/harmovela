import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const contractSchema = JSON.parse(
  readFileSync(resolve(repoRoot, "schemas/capability-contract.schema.json"), "utf8")
);

const ajv = new Ajv({ allErrors: true, strict: false });
const validateContract = ajv.compile(contractSchema);

function readNdjson(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("all contracts in capability-contract-formal.ndjson satisfy the full capability contract schema", () => {
  const events = readNdjson("conformance/fixtures/capability-contract-formal.ndjson");
  assert.equal(events.length, 2);
  for (const [index, event] of events.entries()) {
    assert.equal(event.type, "capability.registered");
    const valid = validateContract(event.payload.contract);
    assert.equal(valid, true, `event ${index} contract invalid: ${JSON.stringify(validateContract.errors)}`);
  }
});

test("no contract in capability-contract-reject.ndjson satisfies the full capability contract schema", () => {
  const events = readNdjson("conformance/fixtures/capability-contract-reject.ndjson");
  assert.equal(events.length, 3);
  for (const [index, event] of events.entries()) {
    const valid = validateContract(event.payload.contract);
    assert.equal(valid, false, `event ${index} contract should be rejected by the full schema`);
  }
});

test("all contracts registered in capability-positive.ndjson satisfy the full capability contract schema", () => {
  const events = readNdjson("conformance/fixtures/capability-positive.ndjson")
    .filter((event) => event.type === "capability.registered");
  assert.equal(events.length, 1);
  for (const event of events) {
    const valid = validateContract(event.payload.contract);
    assert.equal(valid, true, `contract invalid: ${JSON.stringify(validateContract.errors)}`);
  }
});
