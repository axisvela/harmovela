# TypeScript Baseline Test Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align TypeScript runtime-default tests with `/harmovela` and make C0 negative conformance fixtures pass only when invalid inputs are rejected.

**Architecture:** Runtime tests will exercise `defaultConfig()` without overriding its WebSocket path, proving the public default remains reachable. The conformance verifier will branch on the manifest's existing `reject_some` expectation and require at least one existing envelope/schema rejection while preserving normal validation and expected-type checks for positive fixtures.

**Tech Stack:** Node.js test runner, ES modules, AJV schema validation, WebSocket runtime, Markdown protocol specification.

---

### Task 1: Runtime Default WebSocket Tests

**Files:**
- Modify: `implementations/typescript/test/cli-runtime-e2e.test.js:42-49,89-99,149`
- Modify: `implementations/typescript/test/runtime-service.test.js:58`

- [x] **Step 1: Change tests to assert the configured public default path**

```js
const ws = new WebSocket(`ws://127.0.0.1:${port}/harmovela`, ["aep-0.1"]);
```

Replace only WebSocket URLs that rely on `defaultConfig()`; leave explicit custom API paths unchanged.

- [x] **Step 2: Run runtime integration tests after the test-only correction**

Run: `node --test test/runtime-service.test.js test/cli-runtime-e2e.test.js`
Expected: PASS after the test-only correction because `defaultConfig()` already exposes `/harmovela`; this is a stale-baseline correction, not missing production behavior.

### Task 2: Negative Fixture Expectations

**Files:**
- Modify: `implementations/typescript/test/fixtures.test.js:18-25`
- Modify: `implementations/typescript/src/conformance.js:79-139`

- [x] **Step 1: Write a failing fixture test for `reject_some`**

```js
if (fixture.expectation === "reject_some") {
  assert.equal(events.some((event) =>
    validateEnvelope(event).length > 0 || !isValidBySchema(event, "envelope")
  ), true);
  continue;
}
```

Add a runner test that loads the C0 negative fixture through `runConformance()` and asserts its result is `passed`.

- [x] **Step 2: Run the fixture and runner tests to verify RED**

Run: `node --test test/fixtures.test.js`
Expected: FAIL because `verifyFixture()` reports validation failures and rejects `reject_some` as unsupported.

- [x] **Step 3: Implement minimal `reject_some` verification**

```js
if (fixture.expectation === "reject_some") {
  let rejected = false;
  events.forEach((event) => {
    const envelopeErrors = validateEnvelope(event);
    const schemaValid = isValidBySchema(event, "envelope");
    rejected ||= envelopeErrors.length > 0 || !schemaValid;
  });
  if (!rejected) failures.push("expected at least one event rejection");
}
```

Do not add ordinary validation errors to `failures` for rejected inputs. Continue to validate payload schemas only for inputs that otherwise remain valid.

- [x] **Step 4: Run targeted tests and conformance CLI**

Run: `node --test test/fixtures.test.js`
Expected: PASS.

Run: `node ./src/conformance-cli.js --level=HARMOVELA-C0`
Expected: exit code 0 and the negative C0 fixture reported as PASS.

### Task 3: Conformance Documentation And Final Verification

**Files:**
- Modify: `docs/protocol/conformance.md:71-75,94-96`

- [x] **Step 1: Document `reject_some` behavior**

```markdown
`reject_some` means every fixture event is inspected and the fixture passes only when at least one event is rejected by envelope or schema validation. Invalid events in this fixture do not make the fixture fail.
```

- [x] **Step 2: Run the complete TypeScript suite**

Run: `npm test`
Expected: all tests pass.

- [x] **Step 3: Review and commit only scoped files**

```bash
git add implementations/typescript/src/conformance.js implementations/typescript/test/fixtures.test.js implementations/typescript/test/cli-runtime-e2e.test.js implementations/typescript/test/runtime-service.test.js docs/protocol/conformance.md docs/superpowers/plans/2026-07-12-typescript-baseline-test-fixes.md
```
