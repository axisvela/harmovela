import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateEnvelope } from "@axisrobo/harmovela-event";
import { isValidBySchema } from "./schema.js";
import { HarmovelaHarness } from "./harness.js";

const PAYLOAD_VALIDATED_TYPES = new Set([
  "context.invalidated", "context.updated", "context.snapshot.requested", "context.snapshot.ready",
  "memory.fact.invalidated", "memory.fact.added", "memory.fact.updated",
  "belief.revised", "belief.conflict.detected",
  "freshness.expired", "freshness.window.changed",
  "delegation.requested", "delegation.accepted", "delegation.rejected",
  "delegation.handoff.completed", "delegation.escalated",
  "interruption.requested", "interruption.acknowledged", "interruption.saved",
  "interruption.resumed", "interruption.cancelled",
  "compensation.requested", "compensation.completed",
  "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated"
]);

const LEVEL_ORDER = new Map([
  ["HARMOVELA-C0", 0],
  ["HARMOVELA-C1", 1],
  ["HARMOVELA-C2", 2],
  ["HARMOVELA-C3", 3]
]);

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const conformanceDir = resolve(repoRoot, "conformance");

export function loadManifest(path = resolve(conformanceDir, "manifest.json")) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function shouldRunFixture(fixture, targetLevel) {
  if (!LEVEL_ORDER.has(fixture.level)) {
    throw new Error(`unknown fixture level: ${fixture.level}`);
  }
  if (!LEVEL_ORDER.has(targetLevel)) {
    throw new Error(`unknown target level: ${targetLevel}`);
  }
  return LEVEL_ORDER.get(fixture.level) <= LEVEL_ORDER.get(targetLevel);
}

export function readNdjson(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function runConformance(options = {}) {
  const manifest = options.manifest ?? loadManifest();
  const targetLevel = options.targetLevel ?? manifest.default_target_level ?? "HARMOVELA-C1";
  const profile = options.profile ?? null;
  let fixtures = manifest.fixtures;
  if (profile) {
    const profileFixturePaths = new Set(manifest.profiles?.[profile]?.fixtures ?? []);
    fixtures = fixtures.filter((f) => !f.profile || profileFixturePaths.has(f.path));
  }
  const results = [];

  for (const fixture of fixtures) {
    if (!shouldRunFixture(fixture, targetLevel)) {
      results.push({ fixture, status: "skipped", reason: `above target ${targetLevel}` });
      continue;
    }

    const events = readNdjson(resolve(conformanceDir, fixture.path));
    results.push(verifyFixture(fixture, events));
  }

  return { targetLevel, results };
}

export function verifyFixture(fixture, events) {
  const failures = [];
  const types = events.map((event) => event.type);

  if (fixture.expected_types && JSON.stringify(types) !== JSON.stringify(fixture.expected_types)) {
    failures.push(`expected types ${JSON.stringify(fixture.expected_types)}, got ${JSON.stringify(types)}`);
  }

  if (fixture.expectation === "reject_some") {
    let rejected = false;
    const harness = new HarmovelaHarness({ useSchemaValidation: true });
    for (const event of events) {
      const payloadInvalid = PAYLOAD_VALIDATED_TYPES.has(event.type) && !isValidBySchema(event, "payloads");
      const harnessRejected = (harness.handle(event) ?? []).some((response) => response.type.endsWith(".rejected"));
      if (validateEnvelope(event).length > 0 || !isValidBySchema(event, "envelope") || payloadInvalid || harnessRejected) {
        rejected = true;
      }
    }
    if (!rejected) {
      failures.push("expected at least one event rejection");
    }
  } else {
    events.forEach((event, index) => {
      const envelopeErrors = validateEnvelope(event);
      if (envelopeErrors.length > 0) {
        failures.push(`event ${index} envelope: ${envelopeErrors.join("; ")}`);
      }
      if (!isValidBySchema(event, "envelope")) {
        failures.push(`event ${index} schema validation failed`);
      }
      if (PAYLOAD_VALIDATED_TYPES.has(event.type) && !isValidBySchema(event, "payloads")) {
        failures.push(`event ${index} payload schema validation failed for type ${event.type}`);
      }
    });
  }

  if (fixture.expectation === "stateful_flow") {
    const harness = new HarmovelaHarness({ useSchemaValidation: true });
    events.forEach((event, index) => {
      const responses = harness.handle(event) ?? [];
      const rejected = responses.find((response) => response.type === "event.rejected");
      if (rejected) {
        failures.push(`event ${index} rejected: ${rejected.payload?.error?.message ?? "unknown error"}`);
      }
    });
  }

  if (fixture.expectation === "delivery_e2e") {
    const harness = new HarmovelaHarness({ useSchemaValidation: true });
    events.forEach((event, index) => {
      const responses = harness.handle(event) ?? [];
      const rejected = responses.find((response) => response.type === "event.rejected");
      if (rejected) {
        failures.push(`event ${index} rejected: ${rejected.payload?.error?.message ?? "unknown error"}`);
      }
    });
    if (fixture.expected_stats) {
      const stats = harness.delivery.stats;
      const expected = fixture.expected_stats;
      for (const [key, value] of Object.entries(expected)) {
        if (stats[key] !== value) {
          failures.push(`delivery stat ${key}: expected ${value}, got ${stats[key]}`);
        }
      }
    }
  }

  if (!["accept_all", "reject_some", "stateful_flow", "delivery_e2e"].includes(fixture.expectation)) {
    failures.push(`unsupported expectation: ${fixture.expectation}`);
  }

  return {
    fixture,
    status: failures.length === 0 ? "passed" : "failed",
    failures
  };
}
