# Cross-Language Conformance Baselines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shared `reject_some` C0 fixture intentional in all reference implementations and align the WebSocket runtime-default documentation.

**Architecture:** Each existing fixture runner will preserve its strict positive-fixture path while adding a `reject_some` branch that accepts a fixture only when at least one input fails its available envelope, payload, or harness validation. TypeScript will additionally validate recognized payload schemas in that branch. The WebSocket specification will document the runtime configuration default without changing its `aep-0.1` subprotocol examples.

**Tech Stack:** Node.js test runner, pytest, Go testing, JUnit 5, Markdown.

---

### Task 1: Establish Cross-Language RED Tests

**Files:**
- Modify: `implementations/typescript/test/fixtures.test.js`
- Modify: `implementations/python/tests/test_fixtures.py`
- Modify: `implementations/go/aep/conformance_test.go`
- Modify: `implementations/java/src/test/java/com/axisrobo/aep/ConformanceTest.java`

- [x] **Step 1: Add `reject_some` expectation assertions before normal positive validation**

```js
const fixture = { expectation: "reject_some", expected_types: ["context.invalidated"] };
const events = [{ ...validEnvelope, type: "context.invalidated", payload: {} }];
assert.equal(verifyFixture(fixture, events).status, "passed");
```

For Python, Go, and Java, branch on `fixture.expectation` before dereferencing absent `expected_types`; assert that the shared negative fixture has at least one `ValidateEnvelope`/`validate_envelope` rejection and returns from the strict-positive path.

- [x] **Step 2: Run the targeted tests to observe RED**

Run: `node --test test/fixtures.test.js`
Expected: FAIL because TypeScript does not count invalid payload schemas under `reject_some`.

Run: `python -m pytest tests/test_fixtures.py`
Expected: FAIL because `negative.ndjson` has no `expected_types` and is invalid by design.

Run: `go test ./aep -run TestConformanceFixtures`
Expected: FAIL because `negative.ndjson` is validated as positive.

Run: `mvn -Dtest=ConformanceTest test`
Expected: FAIL because `negative.ndjson` is validated as positive.

### Task 2: Implement Existing Runner Expectations

**Files:**
- Modify: `implementations/typescript/src/conformance.js`
- Modify: `implementations/python/tests/test_fixtures.py`
- Modify: `implementations/go/aep/conformance_test.go`
- Modify: `implementations/java/src/test/java/com/axisrobo/aep/ConformanceTest.java`

- [x] **Step 1: Include payload-schema validation in TypeScript negative rejection detection**

```js
const payloadInvalid = PAYLOAD_VALIDATED_TYPES.has(event.type) && !isValidBySchema(event, "payloads");
if (validateEnvelope(event).length > 0 || !isValidBySchema(event, "envelope") || payloadInvalid) rejected = true;
```

- [x] **Step 2: Make each fixture test accept `reject_some` only after a rejection**

```python
rejected = any(validate_envelope(event) or not is_valid_by_schema(event, "envelope") for event in events)
assert rejected, "expected at least one event rejection"
```

Use the language's existing envelope validation in Go and Java. Do not add a new cross-language schema subsystem or change fixtures.

- [x] **Step 3: Run all targeted fixture tests**

Run: `node --test test/fixtures.test.js`
Run: `python -m pytest tests/test_fixtures.py`
Run: `go test ./aep -run TestConformanceFixtures`
Run: `mvn -Dtest=ConformanceTest test`
Expected: each command passes.

### Task 3: Document And Verify

**Files:**
- Modify: `docs/protocol/conformance.md`
- Modify: `docs/protocol/transport-websocket.md`

- [x] **Step 1: Document the runtime WebSocket default and configurability**

```markdown
The reference runtime defaults to `/harmovela`; deployments may configure a different WebSocket path.
```

Keep `aep-0.1` and generic URI examples unchanged.

- [x] **Step 2: Run full relevant suites**

Run: `npm test`
Run: `python -m pytest`
Run: `go test ./...`
Run: `mvn test`
Expected: all available suites pass.

- [x] **Step 3: Commit only the scoped fixtures, runner, test, documentation, and plan files**

```bash
git add implementations/typescript/src/conformance.js implementations/typescript/test/fixtures.test.js implementations/python/tests/test_fixtures.py implementations/go/aep/conformance_test.go implementations/java/src/test/java/com/axisrobo/aep/ConformanceTest.java docs/protocol/conformance.md docs/protocol/transport-websocket.md docs/superpowers/plans/2026-07-12-cross-language-conformance-baselines.md
```
