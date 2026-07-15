import assert from "node:assert/strict";
import test from "node:test";
import { isValidBySchema } from "../src/index.js";

function envelope(type, payload) {
  return {
    spec_version: "0.2",
    id: "evt_cap_test_001",
    type,
    source: "registry:mneme",
    created_at: "2026-07-15T00:00:00Z",
    payload
  };
}

const MINIMAL_CONTRACT = {
  id: "engineering.quality.code_review",
  version: "1.0.0",
  signature: {
    inputs: { repository: { type: "RepositorySnapshot" } },
    outputs: { report: { type: "ReviewReport" } },
    preconditions: ["repo_indexed"],
    postconditions: ["review_logged"]
  },
  permissions: { scope: { "repo:read": true } },
  governance: { risk: "medium" },
  freshness: { valid_from: "2026-01-01T00:00:00Z" },
  implementations: [{ type: "skill", path: "skills/code-review/SKILL.md" }]
};

test("capability.registered with a valid contract passes payload schema", () => {
  const event = envelope("capability.registered", { contract: MINIMAL_CONTRACT });
  assert.equal(isValidBySchema(event, "payloads"), true);
});

test("capability.registered without contract fails payload schema", () => {
  const event = envelope("capability.registered", { registry: "mneme:capabilities" });
  assert.equal(isValidBySchema(event, "payloads"), false);
});

test("capability.registered with invalid risk fails payload schema", () => {
  const contract = { ...MINIMAL_CONTRACT, governance: { risk: "extreme" } };
  const event = envelope("capability.registered", { contract });
  assert.equal(isValidBySchema(event, "payloads"), false);
});

test("capability.registered with empty implementations fails payload schema", () => {
  const contract = { ...MINIMAL_CONTRACT, implementations: [] };
  const event = envelope("capability.registered", { contract });
  assert.equal(isValidBySchema(event, "payloads"), false);
});

test("capability.registered with non-semver version fails payload schema", () => {
  const contract = { ...MINIMAL_CONTRACT, version: "1.2" };
  const event = envelope("capability.registered", { contract });
  assert.equal(isValidBySchema(event, "payloads"), false);
});

test("capability.updated with id and version passes payload schema", () => {
  const event = envelope("capability.updated", {
    capability_id: "engineering.quality.code_review",
    version: "1.1.0",
    previous_version: "1.0.0",
    changes: ["added security lint pass"]
  });
  assert.equal(isValidBySchema(event, "payloads"), true);
});

test("capability.updated without version fails payload schema", () => {
  const event = envelope("capability.updated", {
    capability_id: "engineering.quality.code_review"
  });
  assert.equal(isValidBySchema(event, "payloads"), false);
});

test("capability.deprecated with reason passes payload schema", () => {
  const event = envelope("capability.deprecated", {
    capability_id: "engineering.quality.code_review",
    reason: "superseded by v2 contract"
  });
  assert.equal(isValidBySchema(event, "payloads"), true);
});

test("capability.deprecated without reason fails payload schema", () => {
  const event = envelope("capability.deprecated", {
    capability_id: "engineering.quality.code_review"
  });
  assert.equal(isValidBySchema(event, "payloads"), false);
});

test("capability.composed with two capabilities passes payload schema", () => {
  const event = envelope("capability.composed", {
    composition_id: "comp_01",
    capabilities: ["engineering.quality.code_review", "engineering.release.changelog_generation"]
  });
  assert.equal(isValidBySchema(event, "payloads"), true);
});

test("capability.composed with one capability fails payload schema", () => {
  const event = envelope("capability.composed", {
    composition_id: "comp_01",
    capabilities: ["engineering.quality.code_review"]
  });
  assert.equal(isValidBySchema(event, "payloads"), false);
});

test("capability.validated with CAP level passes payload schema", () => {
  const event = envelope("capability.validated", {
    capability_id: "engineering.quality.code_review",
    level: "CAP-C0",
    verified_by: "harness:harmovela"
  });
  assert.equal(isValidBySchema(event, "payloads"), true);
});

test("capability.validated with unknown level fails payload schema", () => {
  const event = envelope("capability.validated", {
    capability_id: "engineering.quality.code_review",
    level: "CAP-C9"
  });
  assert.equal(isValidBySchema(event, "payloads"), false);
});
