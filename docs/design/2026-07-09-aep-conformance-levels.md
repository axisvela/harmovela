# AEP Conformance Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add draft AEP conformance levels, a shared fixture manifest, and C1 conformance runners for the TypeScript and Python references.

**Architecture:** The conformance model stays implementation-neutral in `docs/specs/conformance.md` and shared metadata lives in `conformance/manifest.json`. TypeScript gets a small reusable conformance module plus `npm run conformance`; Python reuses pytest parametrization against the same manifest. Both runners target AEP-C1 by default and ignore AEP-C2 fixtures until explicitly enabled.

**Tech Stack:** Markdown specs, JSON fixture manifest, Node ESM with `node:test`/`node:assert`, existing TypeScript reference modules, Python 3.12 pytest, existing Python reference modules.

---

## File Structure

- Create: `docs/specs/conformance.md` â€?protocol-facing conformance level specification.
- Create: `conformance/manifest.json` â€?shared source of truth mapping fixtures to levels, expectations, and tags.
- Create: `implementations/typescript/src/conformance.js` â€?TypeScript manifest loader and fixture verifier.
- Create: `implementations/typescript/src/conformance-cli.js` â€?command-line wrapper for `npm run conformance`.
- Modify: `implementations/typescript/package.json` â€?add `conformance` script.
- Modify: `implementations/typescript/test/fixtures.test.js` â€?replace hard-coded fixture list with manifest-driven assertions.
- Modify: `implementations/python/tests/test_fixtures.py` â€?replace hard-coded fixture list with manifest-driven pytest parametrization.
- Modify: `README.md` â€?add conformance spec link and command.
- Modify: `docs/roadmap.md` â€?mark Phase 6 conformance levels with concrete files.
- Modify: `implementations/typescript/README.md` â€?document `npm run conformance`.

## Manifest Shape

Use this JSON structure in `conformance/manifest.json`:

```json
{
  "aep_version": "0.1",
  "default_target_level": "AEP-C1",
  "levels": ["AEP-C0", "AEP-C1", "AEP-C2"],
  "fixtures": [
    {
      "path": "fixtures/task-lifecycle.ndjson",
      "level": "AEP-C1",
      "description": "Task submitted, progress, and completion lifecycle flow.",
      "expectation": "stateful_flow",
      "tags": ["task"],
      "expected_types": ["task.submitted", "task.progress", "task.completed"]
    }
  ]
}
```

`path` is relative to `conformance/`. Runners should execute fixtures with `level` less than or equal to the selected target level.

Level order is fixed: `AEP-C0 < AEP-C1 < AEP-C2`.

## Expectations

- `accept_all`: every event must pass runtime envelope validation and JSON Schema validation.
- `stateful_flow`: every event must pass validation, then each event is sent through `AepHarness.handle`; responses must not include `event.rejected`.
- `reject_some`: reserved for future negative fixtures; do not add a `reject_some` fixture in this slice.

---

### Task 1: Add Conformance Spec And Manifest

**Files:**
- Create: `docs/specs/conformance.md`
- Create: `conformance/manifest.json`
- Modify: `README.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Add the conformance spec**

Create `docs/specs/conformance.md` with this content:

```markdown
# AEP Conformance

> Status: draft. Part of the AEP 0.1 protocol specification.

## Purpose

Define observable compatibility levels for AEP implementations. Conformance levels are cumulative and describe externally visible behavior, not internal architecture.

## Levels

### AEP-C0: Envelope And Schema

An AEP-C0 implementation can parse AEP envelopes and validate shared schema assets.

Required behavior:

- Accept valid envelopes from shared conformance fixtures.
- Reject envelopes missing required fields.
- Reject unsupported protocol versions.
- Reject unknown or malformed standard event types.
- Validate `schemas/aep-envelope.schema.json`.
- Validate `schemas/subscription-filter.schema.json` when checking subscription filters.

### AEP-C1: Core Runtime

An AEP-C1 implementation supports the core local runtime protocol. AEP-C1 includes all AEP-C0 behavior.

Required behavior:

- Process session open, ready, heartbeat, error, and close flows.
- Create, validate, and cancel subscriptions using standard filter fields.
- Route events according to type, source, target, topic, session, task, and metadata filters.
- Process task lifecycle events for accepted, started, progress, blocked, resumed, completed, failed, cancelled, and timed out states.
- Emit standard error payloads for invalid protocol actions.

### AEP-C2: Delivery And Reliability

An AEP-C2 implementation supports observable delivery semantics for distributed or durable deployments. AEP-C2 includes all AEP-C0 and AEP-C1 behavior.

Required behavior:

- Track delivery sequence and cursor state.
- Process acknowledgement and negative acknowledgement events.
- Apply retry policy metadata consistently.
- Move exhausted deliveries to dead-letter state.
- Expose replay behavior through observable event sequences.

## Shared Manifest

Shared conformance fixtures are described by `conformance/manifest.json`.

Manifest paths are relative to `conformance/`. A runner declares a target level and executes every fixture at or below that level. Runners must ignore higher-level fixtures unless explicitly configured to verify that level.

The default target level for AEP 0.1 draft reference runners is AEP-C1.

## Fixture Expectations

`accept_all` means every fixture event must pass envelope and schema validation.

`stateful_flow` means every fixture event must pass validation and must be accepted by the reference harness without producing `event.rejected`.

`reject_some` is reserved for future negative fixtures.
```

- [ ] **Step 2: Add the shared manifest**

Create `conformance/manifest.json` with this content:

```json
{
  "aep_version": "0.1",
  "default_target_level": "AEP-C1",
  "levels": ["AEP-C0", "AEP-C1", "AEP-C2"],
  "fixtures": [
    {
      "path": "fixtures/task-lifecycle.ndjson",
      "level": "AEP-C1",
      "description": "Task submitted, progress, and completion lifecycle flow.",
      "expectation": "stateful_flow",
      "tags": ["task"],
      "expected_types": ["task.submitted", "task.progress", "task.completed"]
    },
    {
      "path": "fixtures/memory-context-ack.ndjson",
      "level": "AEP-C0",
      "description": "Subscription request followed by memory, context, and acknowledgement events.",
      "expectation": "accept_all",
      "tags": ["subscription", "memory", "context", "ack"],
      "expected_types": ["subscription.requested", "memory.fact.added", "context.invalidated", "event.acknowledged"]
    },
    {
      "path": "fixtures/session-flow.ndjson",
      "level": "AEP-C1",
      "description": "Capabilities, session open, subscription, and session close flow.",
      "expectation": "stateful_flow",
      "tags": ["session", "subscription"],
      "expected_types": ["capabilities.requested", "session.opened", "subscription.requested", "session.closed"]
    },
    {
      "path": "fixtures/delivery.ndjson",
      "level": "AEP-C2",
      "description": "Delivery acknowledgement, redelivery, and dead-letter event sequence.",
      "expectation": "accept_all",
      "tags": ["delivery", "ack", "reliability"],
      "expected_types": ["task.submitted", "task.progress", "event.acknowledged", "event.redelivered", "event.dead_lettered"]
    }
  ]
}
```

- [ ] **Step 3: Update README document index and commands**

In `README.md`, add this line after the transport spec links:

```markdown
- `docs/specs/conformance.md` â€?draft conformance levels and shared fixture manifest rules
```

Add this command block after the TypeScript test command:

```markdown
Run TypeScript conformance fixtures:

```sh
cd implementations/typescript && npm run conformance
```
```

- [ ] **Step 4: Update the roadmap Phase 6 item**

In `docs/roadmap.md`, replace:

```markdown
- Conformance levels
```

with:

```markdown
- Conformance levels (`docs/specs/conformance.md`, `conformance/manifest.json`)
```

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/specs/conformance.md conformance/manifest.json README.md docs/roadmap.md
git commit -m "docs: add AEP conformance levels"
```

Expected: commit succeeds with the new spec, manifest, and docs updates.

---

### Task 2: Add TypeScript Manifest-Driven Tests

**Files:**
- Modify: `implementations/typescript/test/fixtures.test.js`

- [ ] **Step 1: Replace hard-coded fixture tests with manifest-driven tests**

Replace `implementations/typescript/test/fixtures.test.js` with:

```js
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
  assert.deepEqual(manifest.levels, ["AEP-C0", "AEP-C1", "AEP-C2"]);
  assert.equal(manifest.default_target_level, "AEP-C1");
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
```

- [ ] **Step 2: Run the focused TypeScript test**

Run:

```bash
cd implementations/typescript
npm test -- test/fixtures.test.js
```

Expected: the fixture test passes. AJV may print warnings about unknown `date-time` and `uri` formats; those warnings are acceptable in the current project setup.

- [ ] **Step 3: Commit**

Run:

```bash
git add implementations/typescript/test/fixtures.test.js
git commit -m "test: drive TypeScript fixtures from conformance manifest"
```

Expected: commit succeeds.

---

### Task 3: Add TypeScript Conformance Runner

**Files:**
- Create: `implementations/typescript/src/conformance.js`
- Create: `implementations/typescript/src/conformance-cli.js`
- Modify: `implementations/typescript/package.json`
- Modify: `implementations/typescript/README.md`

- [ ] **Step 1: Add a failing runner test via CLI command**

Before implementation, run:

```bash
cd implementations/typescript
npm run conformance
```

Expected: FAIL because the `conformance` script does not exist.

- [ ] **Step 2: Add the conformance module**

Create `implementations/typescript/src/conformance.js` with:

```js
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateEnvelope } from "./validate.js";
import { isValidBySchema } from "./schema.js";
import { AepHarness } from "./harness.js";

const LEVEL_ORDER = new Map([
  ["AEP-C0", 0],
  ["AEP-C1", 1],
  ["AEP-C2", 2]
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
  const targetLevel = options.targetLevel ?? manifest.default_target_level ?? "AEP-C1";
  const results = [];

  for (const fixture of manifest.fixtures) {
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

  events.forEach((event, index) => {
    const envelopeErrors = validateEnvelope(event);
    if (envelopeErrors.length > 0) {
      failures.push(`event ${index} envelope: ${envelopeErrors.join("; ")}`);
    }
    if (!isValidBySchema(event, "envelope")) {
      failures.push(`event ${index} schema validation failed`);
    }
  });

  if (fixture.expectation === "stateful_flow") {
    const harness = new AepHarness({ useSchemaValidation: true });
    events.forEach((event, index) => {
      const responses = harness.handle(event) ?? [];
      const rejected = responses.find((response) => response.type === "event.rejected");
      if (rejected) {
        failures.push(`event ${index} rejected: ${rejected.payload?.error?.message ?? "unknown error"}`);
      }
    });
  }

  if (!["accept_all", "stateful_flow"].includes(fixture.expectation)) {
    failures.push(`unsupported expectation: ${fixture.expectation}`);
  }

  return {
    fixture,
    status: failures.length === 0 ? "passed" : "failed",
    failures
  };
}
```

- [ ] **Step 3: Add the CLI wrapper**

Create `implementations/typescript/src/conformance-cli.js` with:

```js
#!/usr/bin/env node
import { runConformance } from "./conformance.js";

const targetArg = process.argv.find((arg) => arg.startsWith("--level="));
const targetLevel = targetArg ? targetArg.slice("--level=".length) : undefined;
const { targetLevel: resolvedTarget, results } = runConformance({ targetLevel });

console.log(`AEP conformance target: ${resolvedTarget}`);

let failed = false;
for (const result of results) {
  const label = `${result.fixture.level} ${result.fixture.path}`;
  if (result.status === "skipped") {
    console.log(`SKIP ${label} (${result.reason})`);
    continue;
  }
  if (result.status === "passed") {
    console.log(`PASS ${label}`);
    continue;
  }
  failed = true;
  console.error(`FAIL ${label}`);
  for (const failure of result.failures) {
    console.error(`  - ${failure}`);
  }
}

if (failed) {
  process.exitCode = 1;
}
```

- [ ] **Step 4: Add the npm script**

In `implementations/typescript/package.json`, update `scripts` to include:

```json
"conformance": "node ./src/conformance-cli.js"
```

Keep the existing scripts unchanged.

- [ ] **Step 5: Document the TypeScript command**

In `implementations/typescript/README.md`, add after the test command:

```markdown
Run conformance fixtures:

```sh
npm run conformance
```
```

- [ ] **Step 6: Run the conformance command**

Run:

```bash
cd implementations/typescript
npm run conformance
```

Expected: PASS for `task-lifecycle.ndjson`, `memory-context-ack.ndjson`, and `session-flow.ndjson`; SKIP for `delivery.ndjson` because it is AEP-C2 and the default target is AEP-C1.

- [ ] **Step 7: Commit**

Run:

```bash
git add implementations/typescript/src/conformance.js implementations/typescript/src/conformance-cli.js implementations/typescript/package.json implementations/typescript/README.md
git commit -m "feat: add TypeScript conformance runner"
```

Expected: commit succeeds.

---

### Task 4: Add Python Manifest-Driven Fixture Tests

**Files:**
- Modify: `implementations/python/tests/test_fixtures.py`

- [ ] **Step 1: Replace hard-coded Python fixture tests**

Replace `implementations/python/tests/test_fixtures.py` with:

```python
import json
from pathlib import Path

import pytest

from aep import validate_envelope
from aep.harness import AepHarness
from aep.schema_validator import is_valid_by_schema

CONFORMANCE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "conformance"
LEVEL_ORDER = {"AEP-C0": 0, "AEP-C1": 1, "AEP-C2": 2}


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_ndjson(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").strip().split("\n") if line.strip()]


MANIFEST = _read_json(CONFORMANCE_DIR / "manifest.json")
TARGET_LEVEL = MANIFEST.get("default_target_level", "AEP-C1")


def _should_run(fixture: dict, target_level: str = TARGET_LEVEL) -> bool:
    return LEVEL_ORDER[fixture["level"]] <= LEVEL_ORDER[target_level]


def _target_fixtures() -> list[dict]:
    return [fixture for fixture in MANIFEST["fixtures"] if _should_run(fixture)]


def test_conformance_manifest_declares_known_draft_levels():
    assert MANIFEST["levels"] == ["AEP-C0", "AEP-C1", "AEP-C2"]
    assert MANIFEST["default_target_level"] == "AEP-C1"


@pytest.mark.parametrize("fixture", _target_fixtures(), ids=lambda f: f["path"])
def test_conformance_fixture_validation(fixture: dict):
    events = _read_ndjson(CONFORMANCE_DIR / fixture["path"])

    assert [event["type"] for event in events] == fixture["expected_types"]
    for event in events:
        assert validate_envelope(event) == []
        assert is_valid_by_schema(event, "envelope") is True


@pytest.mark.parametrize(
    "fixture",
    [fixture for fixture in _target_fixtures() if fixture["expectation"] == "stateful_flow"],
    ids=lambda f: f["path"],
)
def test_conformance_stateful_flows_are_accepted(fixture: dict):
    harness = AepHarness()
    events = _read_ndjson(CONFORMANCE_DIR / fixture["path"])

    for index, event in enumerate(events):
        responses = harness.handle(event) or []
        rejected = [response for response in responses if response["type"] == "event.rejected"]
        assert rejected == [], f"event {index} rejected: {rejected}"
```

- [ ] **Step 2: Run the focused Python test**

Run:

```bash
cd implementations/python
python -m pytest tests/test_fixtures.py -q
```

Expected: manifest tests pass for AEP-C0 and AEP-C1 fixtures. `delivery.ndjson` is skipped by target-level filtering because it is AEP-C2.

- [ ] **Step 3: Commit**

Run:

```bash
git add implementations/python/tests/test_fixtures.py
git commit -m "test: drive Python fixtures from conformance manifest"
```

Expected: commit succeeds.

---

### Task 5: Full Verification And Documentation Polish

**Files:**
- Modify only if verification exposes missing docs or command text: `README.md`, `implementations/typescript/README.md`, `docs/roadmap.md`

- [ ] **Step 1: Run TypeScript tests**

Run:

```bash
cd implementations/typescript
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript conformance**

Run:

```bash
cd implementations/typescript
npm run conformance
```

Expected output includes:

```text
AEP conformance target: AEP-C1
PASS AEP-C1 fixtures/task-lifecycle.ndjson
PASS AEP-C0 fixtures/memory-context-ack.ndjson
PASS AEP-C1 fixtures/session-flow.ndjson
SKIP AEP-C2 fixtures/delivery.ndjson (above target AEP-C1)
```

- [ ] **Step 3: Run Python tests**

Run:

```bash
cd implementations/python
python -m pytest --tb=short -q
```

Expected: all tests pass.

- [ ] **Step 4: Commit any verification doc fixes**

If documentation was adjusted after verification, run:

```bash
git add README.md implementations/typescript/README.md docs/roadmap.md
git commit -m "docs: document conformance verification commands"
```

Expected: commit succeeds only if documentation changed. If no docs changed, skip this step.

---

### Task 6: Push And Record Final State

**Files:**
- No file changes expected.

- [ ] **Step 1: Check status and recent commits**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: working tree is clean and recent commits include the conformance spec, TypeScript runner, and Python manifest tests.

- [ ] **Step 2: Push**

Run:

```bash
git push
```

Expected: push succeeds over SSH. In PowerShell, GitHub push output may appear as `NativeCommandError` even when the final line shows the remote branch updated; treat the remote update line as success.

- [ ] **Step 3: Final status check**

Run:

```bash
git status --short
```

Expected: no output.

---

## Self-Review Notes

- Spec coverage: Task 1 covers `docs/specs/conformance.md` and `conformance/manifest.json`; Tasks 2-4 cover TypeScript/Python fixture execution; Task 5 covers verification and docs; Task 6 covers push/final state.
- Scope: AEP-C2 is specified and represented in the manifest, but default runners target AEP-C1 and skip C2 as designed.
- Placeholder scan: no incomplete placeholder markers remain.
- Type consistency: manifest fields are `path`, `level`, `description`, `expectation`, `tags`, and `expected_types` in both language runners.
