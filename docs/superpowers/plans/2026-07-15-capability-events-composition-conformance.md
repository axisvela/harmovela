# Capability Events, Composition Chain, and CAP-C0 Conformance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register the new `capability.*` event family across all 4 reference implementations with payload schema validation, add a capability composition task-chain fixture, and add CAP-C0 capability-contract conformance fixtures.

**Architecture:** `capability.*` is a brand-new event family (distinct from existing `capabilities.*`). Payload validation is added to the shared `schemas/harmovela-payloads.schema.json` via `if/then` discriminators, including a **lean inline mirror** of the capability-contract constraints inside the `capability.registered` branch (decision: no cross-file `$ref`, because Go/Java runners compile the payloads schema as a single file). CAP-C0 fixtures reuse manifest level `HARMOVELA-C0` plus a new `capability` profile (decision: no new manifest level ID, because all 4 runners hard-assert `levels == [HARMOVELA-C0..C3]`). CAP levels are carried by the contract's own `conformance.level` field.

**Tech Stack:** JSON Schema Draft 2020-12, NDJSON fixtures, Node.js (`node --test`, Ajv 2020), Python (pytest, jsonschema), Go (`go test`, santhosh-tekuri/jsonschema), Java (JUnit 5, Maven, networknt json-schema-validator).

**Spec references:**
- `docs/superpowers/specs/2026-07-14-capability-contract-schema-design.md` (contract shape, CAP levels)
- `schemas/capability-contract.schema.json` (already committed, commit 139bfd1)

**Key decisions locked for this plan:**
1. CAP-C0 fixtures use manifest level `HARMOVELA-C0` + new `capability` profile + tags `["capability", "cap-c0"]`. No runner LEVEL_ORDER changes.
2. `capability.registered` payload embeds the contract; the payloads schema validates it with an inline lean mirror (required 7 fields, id/version patterns, risk enum, signature/permissions/freshness required keys, implementations minItems 1 with type enum). The full-strictness schema (`additionalProperties: false`) stays in `capability-contract.schema.json` and is exercised by a TS Ajv test in Phase 3.
3. Capability IDs in fixtures must match `^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$` — note this pattern does **not** allow hyphens, so fixtures use `code_review`, not `code-review`.

**The 5 new event types:**

| Type | Required payload fields | Purpose |
|------|------------------------|---------|
| `capability.registered` | `contract` | A capability contract was registered in the registry (MNEME) |
| `capability.updated` | `capability_id`, `version` | A new contract version was published |
| `capability.deprecated` | `capability_id`, `reason` | A capability was retired |
| `capability.composed` | `composition_id`, `capabilities` (min 2) | Two or more capabilities were composed into a chain |
| `capability.validated` | `capability_id`, `level` (CAP-C0..C4) | A conformance verification result was recorded |

---

## File Structure

**Phase 1 (capability event payloads):**
- Modify: `schemas/harmovela-payloads.schema.json` — 5 new `if/then` branches
- Create: `implementations/typescript/packages/event/test/capability-payloads.test.js` — schema unit test
- Create: `implementations/typescript/packages/capability/package.json`, `src/index.js`, `test/capability.test.js`
- Modify: `implementations/typescript/package.json` (workspace + dependency), `packages/harness/src/harness.js` (merge), `packages/conformance/src/conformance.js` (PAYLOAD_VALIDATED_TYPES)
- Create: `implementations/python/src/axisrobo_harmovela_capability/__init__.py`, `implementations/python/tests/test_capability_types.py`
- Modify: `implementations/python/src/harmovela_harness/__init__.py` (merge), `implementations/python/tests/test_fixtures.py` (PAYLOAD_VALIDATED_TYPES)
- Create: `implementations/go/capability/capability.go`, `capability_test.go`
- Modify: `implementations/go/harness/util.go` (merge)
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/capability/CapabilityTypes.java`, `src/test/java/com/axisrobo/harmovela/capability/CapabilityTypesTest.java`
- Modify: `implementations/java/src/main/java/com/axisrobo/harmovela/event/envelope/Envelope.java`, `src/main/java/com/axisrobo/harmovela/harness/Harness.java` (STANDARD_TYPES literals)
- Create: `conformance/fixtures/capability-positive.ndjson`, `conformance/fixtures/capability-negative.ndjson`
- Modify: `conformance/manifest.json` (2 fixture entries + `capability` profile)

**Phase 2 (composition task chain):**
- Create: `conformance/fixtures/capability-composed.ndjson`
- Modify: `conformance/manifest.json` (1 fixture entry, profile fixture list)

**Phase 3 (CAP-C0 contract fixtures):**
- Create: `conformance/fixtures/capability-contract-formal.ndjson`, `conformance/fixtures/capability-contract-reject.ndjson`
- Modify: `conformance/manifest.json` (2 fixture entries, profile fixture list)
- Create: `implementations/typescript/packages/conformance/test/capability-contract-fixtures.test.js` — validates fixture contracts against the full `capability-contract.schema.json` with Ajv

---

## Phase 1 — capability.* Event Payload Validation

### Task 1: Payload schema branches for the 5 capability event types

**Files:**
- Test: `implementations/typescript/packages/event/test/capability-payloads.test.js`
- Modify: `schemas/harmovela-payloads.schema.json`

- [ ] **Step 1: Write the failing test**

Create `implementations/typescript/packages/event/test/capability-payloads.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run (workdir `implementations/typescript`): `node --test packages/event/test/capability-payloads.test.js`
Expected: FAIL — the negative assertions fail because the payloads schema has no `capability.*` branches yet (unknown types pass vacuously), e.g. "capability.registered without contract fails payload schema" asserts `false` but gets `true`.

- [ ] **Step 3: Add the 5 if/then branches to the payloads schema**

In `schemas/harmovela-payloads.schema.json`, inside the top-level `"allOf"` array, insert the following 5 objects after the last existing entry (the `provenance.chain.truncated` branch — add a comma after its closing `}` and append before the closing `]`):

```json
    {
      "if": { "properties": { "type": { "const": "capability.registered" } } },
      "then": {
        "properties": {
          "payload": {
            "type": "object",
            "required": ["contract"],
            "properties": {
              "contract": {
                "type": "object",
                "required": ["id", "version", "signature", "permissions", "governance", "freshness", "implementations"],
                "properties": {
                  "id": { "type": "string", "pattern": "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9_]*)+$" },
                  "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$" },
                  "signature": {
                    "type": "object",
                    "required": ["inputs", "outputs", "preconditions", "postconditions"]
                  },
                  "permissions": { "type": "object", "required": ["scope"] },
                  "governance": {
                    "type": "object",
                    "required": ["risk"],
                    "properties": {
                      "risk": { "enum": ["low", "medium", "high", "critical"] }
                    }
                  },
                  "freshness": { "type": "object", "required": ["valid_from"] },
                  "implementations": {
                    "type": "array",
                    "minItems": 1,
                    "items": {
                      "type": "object",
                      "required": ["type", "path"],
                      "properties": {
                        "type": { "enum": ["skill", "script", "workflow", "mcp", "api", "service"] }
                      }
                    }
                  }
                }
              },
              "registry": { "type": "string" }
            }
          }
        }
      }
    },
    {
      "if": { "properties": { "type": { "const": "capability.updated" } } },
      "then": {
        "properties": {
          "payload": {
            "type": "object",
            "required": ["capability_id", "version"],
            "properties": {
              "capability_id": { "type": "string", "pattern": "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9_]*)+$" },
              "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$" },
              "previous_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$" },
              "changes": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    },
    {
      "if": { "properties": { "type": { "const": "capability.deprecated" } } },
      "then": {
        "properties": {
          "payload": {
            "type": "object",
            "required": ["capability_id", "reason"],
            "properties": {
              "capability_id": { "type": "string", "pattern": "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9_]*)+$" },
              "reason": { "type": "string", "minLength": 1 },
              "replaced_by": { "type": "string", "pattern": "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9_]*)+$" },
              "sunset_at": { "type": "string", "format": "date-time" }
            }
          }
        }
      }
    },
    {
      "if": { "properties": { "type": { "const": "capability.composed" } } },
      "then": {
        "properties": {
          "payload": {
            "type": "object",
            "required": ["composition_id", "capabilities"],
            "properties": {
              "composition_id": { "type": "string", "minLength": 1 },
              "capabilities": {
                "type": "array",
                "minItems": 2,
                "items": { "type": "string", "pattern": "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9_]*)+$" }
              },
              "binding": { "type": "object" }
            }
          }
        }
      }
    },
    {
      "if": { "properties": { "type": { "const": "capability.validated" } } },
      "then": {
        "properties": {
          "payload": {
            "type": "object",
            "required": ["capability_id", "level"],
            "properties": {
              "capability_id": { "type": "string", "pattern": "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9_]*)+$" },
              "level": { "enum": ["CAP-C0", "CAP-C1", "CAP-C2", "CAP-C3", "CAP-C4"] },
              "verified_by": { "type": "string" },
              "fixtures": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run (workdir `implementations/typescript`): `node --test packages/event/test/capability-payloads.test.js`
Expected: PASS — all 13 tests.

- [ ] **Step 5: Run the full TS suite to check nothing regressed**

Run (workdir `implementations/typescript`): `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add schemas/harmovela-payloads.schema.json implementations/typescript/packages/event/test/capability-payloads.test.js
git commit -m "feat: add capability.* event payload validation to shared payloads schema"
```

---

### Task 2: TypeScript capability package + harness/conformance registration

**Files:**
- Create: `implementations/typescript/packages/capability/package.json`
- Create: `implementations/typescript/packages/capability/src/index.js`
- Create: `implementations/typescript/packages/capability/test/capability.test.js`
- Modify: `implementations/typescript/package.json`
- Modify: `implementations/typescript/packages/harness/src/harness.js`
- Modify: `implementations/typescript/packages/conformance/src/conformance.js`

- [ ] **Step 1: Write the failing package test**

Create `implementations/typescript/packages/capability/test/capability.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { CAPABILITY_EVENT_TYPES, isCapabilityEventType } from "../src/index.js";

test("capability event types includes all 5 registry entries", () => {
  const expected = [
    "capability.registered",
    "capability.updated",
    "capability.deprecated",
    "capability.composed",
    "capability.validated"
  ];
  for (const type of expected) {
    assert.equal(CAPABILITY_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(CAPABILITY_EVENT_TYPES.size, expected.length);
});

test("isCapabilityEventType positives", () => {
  assert.equal(isCapabilityEventType("capability.registered"), true);
  assert.equal(isCapabilityEventType("capability.updated"), true);
  assert.equal(isCapabilityEventType("capability.deprecated"), true);
  assert.equal(isCapabilityEventType("capability.composed"), true);
  assert.equal(isCapabilityEventType("capability.validated"), true);
});

test("isCapabilityEventType negatives", () => {
  assert.equal(isCapabilityEventType("capabilities.requested"), false);
  assert.equal(isCapabilityEventType("task.submitted"), false);
  assert.equal(isCapabilityEventType("command.requested"), false);
  assert.equal(isCapabilityEventType(""), false);
});
```

Note the first negative: `capabilities.requested` belongs to the pre-existing `capabilities.*` family and must NOT be part of the new `capability.*` family.

- [ ] **Step 2: Run to verify it fails**

Run (workdir `implementations/typescript`): `node --test packages/capability/test/capability.test.js`
Expected: FAIL with "Cannot find module .../packages/capability/src/index.js".

- [ ] **Step 3: Create the package**

Create `implementations/typescript/packages/capability/package.json`:

```json
{
  "name": "@axisrobo/harmovela-capability",
  "version": "0.1.0-draft",
  "private": true,
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "scripts": {
    "test": "node --test"
  }
}
```

Create `implementations/typescript/packages/capability/src/index.js`:

```js
export const CAPABILITY_EVENT_TYPES = new Set([
  "capability.registered",
  "capability.updated",
  "capability.deprecated",
  "capability.composed",
  "capability.validated"
]);

export function isCapabilityEventType(type) {
  return CAPABILITY_EVENT_TYPES.has(type);
}
```

- [ ] **Step 4: Run package test to verify it passes**

Run (workdir `implementations/typescript`): `node --test packages/capability/test/capability.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Wire the package into the workspace**

In `implementations/typescript/package.json`, in `"workspaces"`, after `"packages/query",` add:

```json
    "packages/capability",
```

In the same file's `"dependencies"`, after the line `"@axisrobo/harmovela-query": "file:packages/query",` add:

```json
    "@axisrobo/harmovela-capability": "file:packages/capability",
```

Then run (workdir `implementations/typescript`): `npm install`
Expected: completes without error; `node_modules/@axisrobo/harmovela-capability` symlink exists.

- [ ] **Step 6: Merge into the harness dimension set**

In `implementations/typescript/packages/harness/src/harness.js`, after the import line `import { QUERY_EVENT_TYPES } from "@axisrobo/harmovela-query";` add:

```js
import { CAPABILITY_EVENT_TYPES } from "@axisrobo/harmovela-capability";
```

In the `LEGACY_DIMENSION_EVENT_TYPES` set literal, after `...QUERY_EVENT_TYPES,` add:

```js
  ...CAPABILITY_EVENT_TYPES,
```

- [ ] **Step 7: Add capability types to conformance payload validation**

In `implementations/typescript/packages/conformance/src/conformance.js`, in `PAYLOAD_VALIDATED_TYPES`, after the line `"provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated"` add a comma to that line and then:

```js
  "capability.registered", "capability.updated", "capability.deprecated",
  "capability.composed", "capability.validated"
```

- [ ] **Step 8: Run the full TS suite**

Run (workdir `implementations/typescript`): `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add implementations/typescript/packages/capability implementations/typescript/package.json implementations/typescript/package-lock.json implementations/typescript/packages/harness/src/harness.js implementations/typescript/packages/conformance/src/conformance.js
git commit -m "feat(ts): register capability.* event family and payload validation set"
```

---

### Task 3: Python capability module + harness registration

**Files:**
- Create: `implementations/python/src/axisrobo_harmovela_capability/__init__.py`
- Create: `implementations/python/tests/test_capability_types.py`
- Modify: `implementations/python/src/harmovela_harness/__init__.py`
- Modify: `implementations/python/tests/test_fixtures.py`

- [ ] **Step 1: Write the failing test**

Create `implementations/python/tests/test_capability_types.py`:

```python
from axisrobo_harmovela_capability import CAPABILITY_EVENT_TYPES, is_capability_event_type


def test_capability_event_types_includes_all_entries():
    assert CAPABILITY_EVENT_TYPES == frozenset({
        "capability.registered",
        "capability.updated",
        "capability.deprecated",
        "capability.composed",
        "capability.validated",
    })


def test_is_capability_event_type_positives():
    for type_ in CAPABILITY_EVENT_TYPES:
        assert is_capability_event_type(type_)


def test_is_capability_event_type_negatives():
    assert not is_capability_event_type("capabilities.requested")
    assert not is_capability_event_type("task.submitted")
    assert not is_capability_event_type("")


def test_harness_accepts_capability_event_types():
    from harmovela_harness import is_legacy_dimension_event_type
    for type_ in CAPABILITY_EVENT_TYPES:
        assert is_legacy_dimension_event_type(type_)
```

- [ ] **Step 2: Run to verify it fails**

Run (workdir `implementations/python`): `python -m pytest tests/test_capability_types.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'axisrobo_harmovela_capability'`.

- [ ] **Step 3: Create the module**

Create `implementations/python/src/axisrobo_harmovela_capability/__init__.py`:

```python
CAPABILITY_EVENT_TYPES = frozenset({
    "capability.registered",
    "capability.updated",
    "capability.deprecated",
    "capability.composed",
    "capability.validated",
})


def is_capability_event_type(type_: str) -> bool:
    return type_ in CAPABILITY_EVENT_TYPES


__all__ = ["CAPABILITY_EVENT_TYPES", "is_capability_event_type"]
```

`pyproject.toml` uses `[tool.setuptools.packages.find] where = ["src"]`, so the new package is auto-discovered; if the editable install does not pick it up, re-run `pip install -e .` in `implementations/python`.

- [ ] **Step 4: Merge into the harness dimension set**

In `implementations/python/src/harmovela_harness/__init__.py`:

After the import line `from axisrobo_harmovela_query import QUERY_EVENT_TYPES` add:

```python
from axisrobo_harmovela_capability import CAPABILITY_EVENT_TYPES
```

In the `LEGACY_DIMENSION_EVENT_TYPES` definition, change the trailing chain from:

```python
.union(COMMAND_EVENT_TYPES).union(QUERY_EVENT_TYPES))
```

to:

```python
.union(COMMAND_EVENT_TYPES).union(QUERY_EVENT_TYPES).union(CAPABILITY_EVENT_TYPES))
```

- [ ] **Step 5: Add capability types to conformance payload validation**

In `implementations/python/tests/test_fixtures.py`, in `PAYLOAD_VALIDATED_TYPES`, after the line `"provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",` add:

```python
    "capability.registered", "capability.updated", "capability.deprecated",
    "capability.composed", "capability.validated",
```

- [ ] **Step 6: Run the Python suite**

Run (workdir `implementations/python`): `python -m pytest -q`
Expected: PASS (including the new `test_capability_types.py`).

- [ ] **Step 7: Commit**

```bash
git add implementations/python/src/axisrobo_harmovela_capability implementations/python/tests/test_capability_types.py implementations/python/src/harmovela_harness/__init__.py implementations/python/tests/test_fixtures.py
git commit -m "feat(python): register capability.* event family and payload validation set"
```

---

### Task 4: Go capability package + harness registration

**Files:**
- Create: `implementations/go/capability/capability.go`
- Create: `implementations/go/capability/capability_test.go`
- Modify: `implementations/go/harness/util.go`

- [ ] **Step 1: Write the failing test**

Create `implementations/go/capability/capability_test.go`:

```go
package capability

import "testing"

func TestCapabilityEventTypesIncludesAllEntries(t *testing.T) {
	expected := []string{
		"capability.registered",
		"capability.updated",
		"capability.deprecated",
		"capability.composed",
		"capability.validated",
	}
	for _, typ := range expected {
		if !EventTypes[typ] {
			t.Errorf("missing: %s", typ)
		}
	}
	if len(EventTypes) != len(expected) {
		t.Errorf("size mismatch: got %d, want %d", len(EventTypes), len(expected))
	}
}

func TestIsEventTypePositives(t *testing.T) {
	tests := []string{
		"capability.registered",
		"capability.updated",
		"capability.deprecated",
		"capability.composed",
		"capability.validated",
	}
	for _, typ := range tests {
		if !IsEventType(typ) {
			t.Errorf("expected true for %s", typ)
		}
	}
}

func TestIsEventTypeNegatives(t *testing.T) {
	tests := []string{
		"capabilities.requested",
		"task.submitted",
		"command.requested",
		"",
	}
	for _, typ := range tests {
		if IsEventType(typ) {
			t.Errorf("expected false for %s", typ)
		}
	}
}
```

- [ ] **Step 2: Run to verify it fails**

Run (workdir `implementations/go`): `go test ./capability/...`
Expected: FAIL (build error — `EventTypes` and `IsEventType` undefined).

- [ ] **Step 3: Create the package**

Create `implementations/go/capability/capability.go`:

```go
package capability

var EventTypes = map[string]bool{
	"capability.registered": true,
	"capability.updated":    true,
	"capability.deprecated": true,
	"capability.composed":   true,
	"capability.validated":  true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}
```

- [ ] **Step 4: Run to verify it passes**

Run (workdir `implementations/go`): `go test ./capability/...`
Expected: PASS.

- [ ] **Step 5: Merge into the harness dimension set**

In `implementations/go/harness/util.go`:

In the import block, after `"github.com/axisrobo/harmovela/agent"` add (keep alphabetical order):

```go
	"github.com/axisrobo/harmovela/capability"
```

In the `legacyStandardEventTypes` initializer, after the `query.EventTypes` merge loop:

```go
	for k, v := range query.EventTypes {
		m[k] = v
	}
```

add:

```go
	for k, v := range capability.EventTypes {
		m[k] = v
	}
```

- [ ] **Step 6: Run the full Go suite**

Run (workdir `implementations/go`): `go test ./...`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add implementations/go/capability implementations/go/harness/util.go
git commit -m "feat(go): register capability.* event family in harness registry"
```

---

### Task 5: Java capability types + Envelope/Harness registration

**Files:**
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/capability/CapabilityTypes.java`
- Create: `implementations/java/src/test/java/com/axisrobo/harmovela/capability/CapabilityTypesTest.java`
- Modify: `implementations/java/src/main/java/com/axisrobo/harmovela/event/envelope/Envelope.java`
- Modify: `implementations/java/src/main/java/com/axisrobo/harmovela/harness/Harness.java`

- [ ] **Step 1: Write the failing test**

Create `implementations/java/src/test/java/com/axisrobo/harmovela/capability/CapabilityTypesTest.java`:

```java
package com.axisrobo.harmovela.capability;

import com.axisrobo.harmovela.event.envelope.Envelope;
import org.junit.jupiter.api.Test;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

class CapabilityTypesTest {

    @Test
    void eventTypesIncludesAllEntries() {
        assertEquals(Set.of(
            "capability.registered",
            "capability.updated",
            "capability.deprecated",
            "capability.composed",
            "capability.validated"
        ), CapabilityTypes.EVENT_TYPES);
    }

    @Test
    void isCapabilityEventTypePositives() {
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.registered"));
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.updated"));
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.deprecated"));
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.composed"));
        assertTrue(CapabilityTypes.isCapabilityEventType("capability.validated"));
    }

    @Test
    void isCapabilityEventTypeNegatives() {
        assertFalse(CapabilityTypes.isCapabilityEventType("capabilities.requested"));
        assertFalse(CapabilityTypes.isCapabilityEventType("command.requested"));
        assertFalse(CapabilityTypes.isCapabilityEventType(null));
    }

    @Test
    void envelopeRegistryAcceptsCapabilityEventTypes() {
        for (var type : CapabilityTypes.EVENT_TYPES) {
            assertTrue(Envelope.isStandardEventType(type), "envelope registry missing " + type);
        }
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run (workdir `implementations/java`): `mvn -q test -Dtest=CapabilityTypesTest`
Expected: FAIL — compilation error (`CapabilityTypes` does not exist).

- [ ] **Step 3: Create the types class**

Create `implementations/java/src/main/java/com/axisrobo/harmovela/capability/CapabilityTypes.java`:

```java
package com.axisrobo.harmovela.capability;

import java.util.Set;

public final class CapabilityTypes {
    private CapabilityTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "capability.registered",
        "capability.updated",
        "capability.deprecated",
        "capability.composed",
        "capability.validated"
    );

    public static boolean isCapabilityEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}
```

- [ ] **Step 4: Register the types in Envelope and Harness**

In `implementations/java/src/main/java/com/axisrobo/harmovela/event/envelope/Envelope.java`, in `STANDARD_TYPES`, change:

```java
        "query.requested", "query.response", "query.rejected",
        "query.error"
    );
```

to:

```java
        "query.requested", "query.response", "query.rejected",
        "query.error",
        "capability.registered", "capability.updated", "capability.deprecated",
        "capability.composed", "capability.validated"
    );
```

In `implementations/java/src/main/java/com/axisrobo/harmovela/harness/Harness.java`, apply the identical change to its `STANDARD_TYPES` set (same before/after text as above).

- [ ] **Step 5: Run to verify it passes**

Run (workdir `implementations/java`): `mvn -q test -Dtest=CapabilityTypesTest`
Expected: PASS — 4 tests.

- [ ] **Step 6: Run the full Java suite**

Run (workdir `implementations/java`): `mvn -q test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add implementations/java/src/main/java/com/axisrobo/harmovela/capability implementations/java/src/test/java/com/axisrobo/harmovela/capability implementations/java/src/main/java/com/axisrobo/harmovela/event/envelope/Envelope.java implementations/java/src/main/java/com/axisrobo/harmovela/harness/Harness.java
git commit -m "feat(java): register capability.* event family in envelope and harness registries"
```

---

### Task 6: Capability positive/negative fixtures + manifest capability profile

**Files:**
- Create: `conformance/fixtures/capability-positive.ndjson`
- Create: `conformance/fixtures/capability-negative.ndjson`
- Modify: `conformance/manifest.json`

- [ ] **Step 1: Add the manifest entries first (failing state)**

In `conformance/manifest.json`, in the `"fixtures"` array, after the `fixtures/query-negative.ndjson` entry (add a comma after its closing `}`), append:

```json
    {
      "path": "fixtures/capability-positive.ndjson",
      "level": "HARMOVELA-C0",
      "description": "Capability contract lifecycle: registered, updated, validated, and deprecated events with payload schema validation.",
      "expectation": "accept_all",
      "profile": "capability",
      "tags": [
        "capability"
      ],
      "expected_types": [
        "capability.registered",
        "capability.updated",
        "capability.validated",
        "capability.deprecated"
      ]
    },
    {
      "path": "fixtures/capability-negative.ndjson",
      "level": "HARMOVELA-C0",
      "description": "Invalid capability payloads rejected: bad governance risk enum, missing version, unknown CAP level.",
      "expectation": "reject_some",
      "profile": "capability",
      "tags": [
        "negative",
        "capability"
      ],
      "expected_types": [
        "capability.registered",
        "capability.updated",
        "capability.validated"
      ]
    }
```

In the `"profiles"` object, after the `"adaptation"` profile (add a comma after its closing `}`), append:

```json
    "capability": {
      "display_name": "Capability Contract",
      "description": "Typed capability contract lifecycle: registration, versioned update, validation, deprecation, composition chains, and CAP-C0 contract conformance.",
      "required_core_level": "HARMOVELA-C0",
      "levels": ["HARMOVELA-C0"],
      "fixtures": [
        "fixtures/capability-positive.ndjson",
        "fixtures/capability-negative.ndjson"
      ]
    }
```

- [ ] **Step 2: Run one conformance suite to verify it fails**

Run (workdir `implementations/python`): `python -m pytest tests/test_fixtures.py -q`
Expected: FAIL — `FileNotFoundError` for `conformance/fixtures/capability-positive.ndjson`.

- [ ] **Step 3: Create the positive fixture**

Create `conformance/fixtures/capability-positive.ndjson` (4 lines, each a single-line JSON object):

```
{"spec_version":"0.2","id":"evt_cap_pos_001","type":"capability.registered","source":"registry:mneme","correlation_id":"cap_corr_001","created_at":"2026-07-15T09:00:00Z","payload":{"contract":{"id":"engineering.quality.code_review","version":"1.0.0","signature":{"inputs":{"repository":{"type":"RepositorySnapshot"}},"outputs":{"report":{"type":"ReviewReport"}},"preconditions":["repo_indexed"],"postconditions":["review_logged"]},"permissions":{"scope":{"repo:read":true}},"governance":{"risk":"medium"},"freshness":{"valid_from":"2026-01-01T00:00:00Z"},"implementations":[{"type":"skill","path":"skills/code-review/SKILL.md"}]},"registry":"mneme:capabilities"}}
{"spec_version":"0.2","id":"evt_cap_pos_002","type":"capability.updated","source":"registry:mneme","correlation_id":"cap_corr_001","causation_id":"evt_cap_pos_001","created_at":"2026-07-15T09:05:00Z","payload":{"capability_id":"engineering.quality.code_review","version":"1.1.0","previous_version":"1.0.0","changes":["added security lint pass"]}}
{"spec_version":"0.2","id":"evt_cap_pos_003","type":"capability.validated","source":"harness:harmovela","correlation_id":"cap_corr_001","causation_id":"evt_cap_pos_002","created_at":"2026-07-15T09:10:00Z","payload":{"capability_id":"engineering.quality.code_review","level":"CAP-C0","verified_by":"harness:harmovela","fixtures":["conformance/fixtures/capability-contract-formal.ndjson"]}}
{"spec_version":"0.2","id":"evt_cap_pos_004","type":"capability.deprecated","source":"registry:mneme","correlation_id":"cap_corr_001","causation_id":"evt_cap_pos_003","created_at":"2026-07-15T09:15:00Z","payload":{"capability_id":"engineering.quality.code_review","reason":"superseded by v2 contract","replaced_by":"engineering.quality.code_review_v2"}}
```

- [ ] **Step 4: Create the negative fixture**

Create `conformance/fixtures/capability-negative.ndjson` (3 lines; each is envelope-valid but payload-schema-invalid):

```
{"spec_version":"0.2","id":"evt_cap_neg_001","type":"capability.registered","source":"registry:mneme","correlation_id":"cap_corr_neg","created_at":"2026-07-15T10:00:00Z","payload":{"contract":{"id":"engineering.quality.code_review","version":"1.0.0","signature":{"inputs":{"repository":{"type":"RepositorySnapshot"}},"outputs":{"report":{"type":"ReviewReport"}},"preconditions":["repo_indexed"],"postconditions":["review_logged"]},"permissions":{"scope":{"repo:read":true}},"governance":{"risk":"extreme"},"freshness":{"valid_from":"2026-01-01T00:00:00Z"},"implementations":[{"type":"skill","path":"skills/code-review/SKILL.md"}]}}}
{"spec_version":"0.2","id":"evt_cap_neg_002","type":"capability.updated","source":"registry:mneme","correlation_id":"cap_corr_neg","created_at":"2026-07-15T10:01:00Z","payload":{"capability_id":"engineering.quality.code_review"}}
{"spec_version":"0.2","id":"evt_cap_neg_003","type":"capability.validated","source":"harness:harmovela","correlation_id":"cap_corr_neg","created_at":"2026-07-15T10:02:00Z","payload":{"capability_id":"engineering.quality.code_review","level":"CAP-C9"}}
```

Violations: line 1 `governance.risk: "extreme"` (bad enum), line 2 missing `version`, line 3 `level: "CAP-C9"` (bad enum).

- [ ] **Step 5: Run all four conformance suites**

Run each of the following; all must PASS:
- (workdir `implementations/typescript`) `npm test`
- (workdir `implementations/python`) `python -m pytest -q`
- (workdir `implementations/go`) `go test ./...`
- (workdir `implementations/java`) `mvn -q test`

If a language rejects the positive fixture, debug that language's registration from Tasks 2-5 before proceeding (do not weaken the fixture).

- [ ] **Step 6: Commit**

```bash
git add conformance/fixtures/capability-positive.ndjson conformance/fixtures/capability-negative.ndjson conformance/manifest.json
git commit -m "feat(conformance): add capability lifecycle fixtures and capability profile"
```

---

## Phase 2 — Composition Task Chain Fixture

### Task 7: capability-composed.ndjson task chain

**Files:**
- Create: `conformance/fixtures/capability-composed.ndjson`
- Modify: `conformance/manifest.json`

The chain models one `capability.composed` declaration followed by two sequential capability-execution tasks. Linkage: every event carries `causation_id` of the previous event in its chain; the second task carries `parent_task_id` pointing at the first task, expressing that its execution depends on the first capability's output.

- [ ] **Step 1: Add the manifest entry first (failing state)**

In `conformance/manifest.json`, in `"fixtures"`, after the `fixtures/capability-negative.ndjson` entry, append:

```json
    {
      "path": "fixtures/capability-composed.ndjson",
      "level": "HARMOVELA-C1",
      "description": "Capability composition chain: capability.composed declaration followed by two capability execution tasks linked by causation_id and parent_task_id.",
      "expectation": "stateful_flow",
      "profile": "capability",
      "tags": [
        "capability",
        "composition",
        "task"
      ],
      "expected_types": [
        "capability.composed",
        "task.submitted",
        "task.accepted",
        "task.started",
        "task.completed",
        "task.submitted",
        "task.accepted",
        "task.started",
        "task.completed"
      ]
    }
```

In the `"capability"` profile's `"fixtures"` array, extend to:

```json
      "fixtures": [
        "fixtures/capability-positive.ndjson",
        "fixtures/capability-negative.ndjson",
        "fixtures/capability-composed.ndjson"
      ]
```

Also extend the profile's `"levels"` to `["HARMOVELA-C0", "HARMOVELA-C1"]` and `"required_core_level"` stays `"HARMOVELA-C0"`.

- [ ] **Step 2: Run one conformance suite to verify it fails**

Run (workdir `implementations/python`): `python -m pytest tests/test_fixtures.py -q`
Expected: FAIL — `FileNotFoundError` for `conformance/fixtures/capability-composed.ndjson`.

- [ ] **Step 3: Create the fixture**

Create `conformance/fixtures/capability-composed.ndjson` (9 lines):

```
{"spec_version":"0.2","id":"evt_cap_comp_001","type":"capability.composed","source":"agent:orchestrator","correlation_id":"comp_corr_001","session_id":"sess_comp","conversation_id":"conv_comp","created_at":"2026-07-15T11:00:00Z","payload":{"composition_id":"comp_01","capabilities":["engineering.quality.code_review","engineering.release.changelog_generation"],"binding":{"changelog_input":"review_report"}}}
{"spec_version":"0.2","id":"evt_cap_comp_002","type":"task.submitted","source":"agent:orchestrator","target":"agent:reviewer","topic":"tasks.task_cap_review","session_id":"sess_comp","conversation_id":"conv_comp","task_id":"task_cap_review","correlation_id":"comp_corr_001","causation_id":"evt_cap_comp_001","created_at":"2026-07-15T11:00:01Z","payload":{"task_id":"task_cap_review","state":"submitted","description":"execute capability engineering.quality.code_review","capability_id":"engineering.quality.code_review","composition_id":"comp_01"}}
{"spec_version":"0.2","id":"evt_cap_comp_003","type":"task.accepted","source":"agent:reviewer","target":"agent:orchestrator","topic":"tasks.task_cap_review","session_id":"sess_comp","conversation_id":"conv_comp","task_id":"task_cap_review","correlation_id":"comp_corr_001","causation_id":"evt_cap_comp_002","created_at":"2026-07-15T11:00:02Z","payload":{"task_id":"task_cap_review","state":"accepted"}}
{"spec_version":"0.2","id":"evt_cap_comp_004","type":"task.started","source":"agent:reviewer","target":"agent:orchestrator","topic":"tasks.task_cap_review","session_id":"sess_comp","conversation_id":"conv_comp","task_id":"task_cap_review","correlation_id":"comp_corr_001","causation_id":"evt_cap_comp_003","created_at":"2026-07-15T11:00:05Z","payload":{"task_id":"task_cap_review","state":"started"}}
{"spec_version":"0.2","id":"evt_cap_comp_005","type":"task.completed","source":"agent:reviewer","target":"agent:orchestrator","topic":"tasks.task_cap_review","session_id":"sess_comp","conversation_id":"conv_comp","task_id":"task_cap_review","correlation_id":"comp_corr_001","causation_id":"evt_cap_comp_004","created_at":"2026-07-15T11:02:00Z","payload":{"task_id":"task_cap_review","state":"completed","result":"review_report ready"}}
{"spec_version":"0.2","id":"evt_cap_comp_006","type":"task.submitted","source":"agent:orchestrator","target":"agent:releaser","topic":"tasks.task_cap_changelog","session_id":"sess_comp","conversation_id":"conv_comp","task_id":"task_cap_changelog","parent_task_id":"task_cap_review","correlation_id":"comp_corr_001","causation_id":"evt_cap_comp_005","created_at":"2026-07-15T11:02:01Z","payload":{"task_id":"task_cap_changelog","state":"submitted","description":"execute capability engineering.release.changelog_generation","capability_id":"engineering.release.changelog_generation","composition_id":"comp_01"}}
{"spec_version":"0.2","id":"evt_cap_comp_007","type":"task.accepted","source":"agent:releaser","target":"agent:orchestrator","topic":"tasks.task_cap_changelog","session_id":"sess_comp","conversation_id":"conv_comp","task_id":"task_cap_changelog","parent_task_id":"task_cap_review","correlation_id":"comp_corr_001","causation_id":"evt_cap_comp_006","created_at":"2026-07-15T11:02:02Z","payload":{"task_id":"task_cap_changelog","state":"accepted"}}
{"spec_version":"0.2","id":"evt_cap_comp_008","type":"task.started","source":"agent:releaser","target":"agent:orchestrator","topic":"tasks.task_cap_changelog","session_id":"sess_comp","conversation_id":"conv_comp","task_id":"task_cap_changelog","parent_task_id":"task_cap_review","correlation_id":"comp_corr_001","causation_id":"evt_cap_comp_007","created_at":"2026-07-15T11:02:05Z","payload":{"task_id":"task_cap_changelog","state":"started"}}
{"spec_version":"0.2","id":"evt_cap_comp_009","type":"task.completed","source":"agent:releaser","target":"agent:orchestrator","topic":"tasks.task_cap_changelog","session_id":"sess_comp","conversation_id":"conv_comp","task_id":"task_cap_changelog","parent_task_id":"task_cap_review","correlation_id":"comp_corr_001","causation_id":"evt_cap_comp_008","created_at":"2026-07-15T11:03:00Z","payload":{"task_id":"task_cap_changelog","state":"completed","result":"changelog generated"}}
```

Notes for the implementer:
- Harness behavior: `capability.composed` has no dedicated route handler, so every harness returns a default `event.acknowledged` — that is a pass for `stateful_flow` (only `event.rejected` fails it).
- The two tasks use distinct `task_id`s, so each gets its own TaskTracker; both walk the legal `submitted→accepted→started→completed` path.

- [ ] **Step 4: Run all four conformance suites**

Run each; all must PASS:
- (workdir `implementations/typescript`) `npm test`
- (workdir `implementations/python`) `python -m pytest -q`
- (workdir `implementations/go`) `go test ./...`
- (workdir `implementations/java`) `mvn -q test`

- [ ] **Step 5: Commit**

```bash
git add conformance/fixtures/capability-composed.ndjson conformance/manifest.json
git commit -m "feat(conformance): add capability composition task-chain fixture"
```

---

## Phase 3 — CAP-C0 Contract Conformance Fixtures

### Task 8: CAP-C0 formal/reject fixtures + manifest

**Files:**
- Create: `conformance/fixtures/capability-contract-formal.ndjson`
- Create: `conformance/fixtures/capability-contract-reject.ndjson`
- Modify: `conformance/manifest.json`

- [ ] **Step 1: Add the manifest entries first (failing state)**

In `conformance/manifest.json`, in `"fixtures"`, after the `fixtures/capability-composed.ndjson` entry, append:

```json
    {
      "path": "fixtures/capability-contract-formal.ndjson",
      "level": "HARMOVELA-C0",
      "description": "CAP-C0 contract conformance: minimal and fully-populated capability contracts accepted via capability.registered.",
      "expectation": "accept_all",
      "profile": "capability",
      "tags": [
        "capability",
        "cap-c0"
      ],
      "expected_types": [
        "capability.registered",
        "capability.registered"
      ]
    },
    {
      "path": "fixtures/capability-contract-reject.ndjson",
      "level": "HARMOVELA-C0",
      "description": "CAP-C0 contract rejection: missing signature, non-semver version, and empty implementations rejected by the payload schema contract mirror.",
      "expectation": "reject_some",
      "profile": "capability",
      "tags": [
        "negative",
        "capability",
        "cap-c0"
      ],
      "expected_types": [
        "capability.registered",
        "capability.registered",
        "capability.registered"
      ]
    }
```

In the `"capability"` profile's `"fixtures"` array, extend to the final list:

```json
      "fixtures": [
        "fixtures/capability-positive.ndjson",
        "fixtures/capability-negative.ndjson",
        "fixtures/capability-composed.ndjson",
        "fixtures/capability-contract-formal.ndjson",
        "fixtures/capability-contract-reject.ndjson"
      ]
```

- [ ] **Step 2: Run one conformance suite to verify it fails**

Run (workdir `implementations/python`): `python -m pytest tests/test_fixtures.py -q`
Expected: FAIL — `FileNotFoundError` for `conformance/fixtures/capability-contract-formal.ndjson`.

- [ ] **Step 3: Create the formal fixture**

Create `conformance/fixtures/capability-contract-formal.ndjson` (2 lines). Line 1 carries the minimal contract; line 2 carries a fully-populated contract exercising every optional block (display_name, tags, effects, recovery, enterprise, selector, conformance):

```
{"spec_version":"0.2","id":"evt_cap_c0_001","type":"capability.registered","source":"registry:mneme","correlation_id":"cap_c0_corr","created_at":"2026-07-15T12:00:00Z","payload":{"contract":{"id":"engineering.quality.code_review","version":"1.0.0","signature":{"inputs":{"repository":{"type":"RepositorySnapshot"}},"outputs":{"report":{"type":"ReviewReport"}},"preconditions":["repo_indexed"],"postconditions":["review_logged"]},"permissions":{"scope":{"repo:read":true}},"governance":{"risk":"medium"},"freshness":{"valid_from":"2026-01-01T00:00:00Z"},"implementations":[{"type":"skill","path":"skills/code-review/SKILL.md"}]},"registry":"mneme:capabilities"}}
{"spec_version":"0.2","id":"evt_cap_c0_002","type":"capability.registered","source":"registry:mneme","correlation_id":"cap_c0_corr","causation_id":"evt_cap_c0_001","created_at":"2026-07-15T12:01:00Z","payload":{"contract":{"id":"engineering.release.changelog_generation","version":"1.2.0","display_name":"Changelog Generation","description":"Generate a changelog from merged pull requests and commit history","tags":["release","automation"],"signature":{"inputs":{"commit_range":{"type":"CommitRange","required":true}},"outputs":{"changelog":{"type":"ChangelogDocument"}},"preconditions":["repo_indexed"],"postconditions":["changelog_written"],"effects":["may_read_source","may_write_docs"],"idempotency":"idempotent","recovery":{"compensation":"engineering.release.changelog_rollback","retry_strategy":"exponential_backoff","max_retries":3}},"permissions":{"scope":{"repo:read":true,"repo:write:docs":true},"network":"disabled","filesystem":"scoped_rw","max_runtime_ms":600000},"governance":{"risk":"low","approval":{"production":"auto"},"owner":"team:release-engineering","review_interval":"P90D"},"freshness":{"valid_from":"2026-01-01T00:00:00Z","valid_until":"2027-01-01T00:00:00Z","stale_after":"P180D"},"enterprise":{"business_domain":["Engineering"],"regions":["global"],"apqc_processes":[{"category_id":"8.2.1","process_name":"Perform quality assurance","level":3}],"compliance_frameworks":["SOC2"]},"selector":{"strategy":"priority","rules":[{"prefer":"script","when":{"sandbox":"docker"}}],"default":"skill"},"implementations":[{"type":"skill","path":"skills/changelog/SKILL.md","runtime":"node"},{"type":"script","path":"scripts/changelog.py","entrypoint":"main","runtime":"python"}],"conformance":{"level":"CAP-C0","golden_cases":["conformance/fixtures/capability-contract-formal.ndjson"],"last_verified":"2026-07-15T00:00:00Z","verified_by":"harness:harmovela"}},"registry":"mneme:capabilities"}}
```

- [ ] **Step 4: Create the reject fixture**

Create `conformance/fixtures/capability-contract-reject.ndjson` (3 lines; all envelope-valid, all violating the contract mirror in the payloads schema):

```
{"spec_version":"0.2","id":"evt_cap_c0_rej_001","type":"capability.registered","source":"registry:mneme","correlation_id":"cap_c0_rej","created_at":"2026-07-15T13:00:00Z","payload":{"contract":{"id":"engineering.quality.code_review","version":"1.0.0","permissions":{"scope":{"repo:read":true}},"governance":{"risk":"medium"},"freshness":{"valid_from":"2026-01-01T00:00:00Z"},"implementations":[{"type":"skill","path":"skills/code-review/SKILL.md"}]}}}
{"spec_version":"0.2","id":"evt_cap_c0_rej_002","type":"capability.registered","source":"registry:mneme","correlation_id":"cap_c0_rej","created_at":"2026-07-15T13:01:00Z","payload":{"contract":{"id":"engineering.quality.code_review","version":"1.2","signature":{"inputs":{"repository":{"type":"RepositorySnapshot"}},"outputs":{"report":{"type":"ReviewReport"}},"preconditions":["repo_indexed"],"postconditions":["review_logged"]},"permissions":{"scope":{"repo:read":true}},"governance":{"risk":"medium"},"freshness":{"valid_from":"2026-01-01T00:00:00Z"},"implementations":[{"type":"skill","path":"skills/code-review/SKILL.md"}]}}}
{"spec_version":"0.2","id":"evt_cap_c0_rej_003","type":"capability.registered","source":"registry:mneme","correlation_id":"cap_c0_rej","created_at":"2026-07-15T13:02:00Z","payload":{"contract":{"id":"engineering.quality.code_review","version":"1.0.0","signature":{"inputs":{"repository":{"type":"RepositorySnapshot"}},"outputs":{"report":{"type":"ReviewReport"}},"preconditions":["repo_indexed"],"postconditions":["review_logged"]},"permissions":{"scope":{"repo:read":true}},"governance":{"risk":"medium"},"freshness":{"valid_from":"2026-01-01T00:00:00Z"},"implementations":[]}}}
```

Violations: line 1 missing `signature`, line 2 `version: "1.2"` (not semver), line 3 `implementations: []` (minItems 1).

- [ ] **Step 5: Run all four conformance suites**

Run each; all must PASS:
- (workdir `implementations/typescript`) `npm test`
- (workdir `implementations/python`) `python -m pytest -q`
- (workdir `implementations/go`) `go test ./...`
- (workdir `implementations/java`) `mvn -q test`

- [ ] **Step 6: Commit**

```bash
git add conformance/fixtures/capability-contract-formal.ndjson conformance/fixtures/capability-contract-reject.ndjson conformance/manifest.json
git commit -m "feat(conformance): add CAP-C0 capability contract formal and reject fixtures"
```

---

### Task 9: Full-strictness contract validation test (Ajv against capability-contract.schema.json)

The payloads-schema mirror is intentionally lean. This task guarantees the CAP-C0 fixture contracts are ALSO valid against the full `schemas/capability-contract.schema.json` (which enforces `additionalProperties: false`), so the fixtures stay honest representations of real registry entries.

**Files:**
- Create: `implementations/typescript/packages/conformance/test/capability-contract-fixtures.test.js`

- [ ] **Step 1: Write the test**

Create `implementations/typescript/packages/conformance/test/capability-contract-fixtures.test.js`:

```js
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
```

- [ ] **Step 2: Run the test**

Run (workdir `implementations/typescript`): `node --test packages/conformance/test/capability-contract-fixtures.test.js`
Expected: PASS — 3 tests. If a formal contract fails the full schema (e.g., an unexpected property tripping `additionalProperties: false`), fix the **fixture** to conform to `capability-contract.schema.json` — do not loosen the schema.

- [ ] **Step 3: Run the full TS suite**

Run (workdir `implementations/typescript`): `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add implementations/typescript/packages/conformance/test/capability-contract-fixtures.test.js
git commit -m "test(ts): validate CAP-C0 fixture contracts against full capability contract schema"
```

---

### Task 10: Final cross-language verification and record

- [ ] **Step 1: Run all four suites end-to-end**

- (workdir `implementations/typescript`) `npm test` — expected PASS
- (workdir `implementations/python`) `python -m pytest -q` — expected PASS
- (workdir `implementations/go`) `go test ./...` — expected PASS
- (workdir `implementations/java`) `mvn -q test` — expected PASS

- [ ] **Step 2: Run the capability profile explicitly in one language as a smoke check**

Run (workdir `implementations/python`): PowerShell `$env:HARMOVELA_PROFILE="capability"; python -m pytest tests/test_fixtures.py -q; Remove-Item Env:HARMOVELA_PROFILE`
Expected: PASS — capability fixtures selected, non-profile fixtures still included per the filter semantics.

- [ ] **Step 3: Record verification in this plan**

Append a `## Verification Record` section at the bottom of this plan file with the date, the four command outputs (summary lines), and total fixture count (should be 32 + 5 = 37 fixtures × 4 languages).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-07-15-capability-events-composition-conformance.md
git commit -m "docs: record capability conformance verification results"
```

---

## Out of Scope (separate gates)

- MNEME registry storage, ORCHID O-0 matching, Archon Guard token issuance (external projects)
- Harness route handlers with capability lifecycle state machines (no state tracking needed for these fixtures; default acknowledgement is correct)
- CAP-C1..C4 fixtures (require capability execution semantics, deferred)
- Any change to `capabilities.*` (existing family, untouched)
