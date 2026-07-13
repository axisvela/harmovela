# Event Dimension Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Event-domain implementation from legacy `aep` namespaces into independent Harmovela Event modules across four languages, while retaining `aep` only as a one-way adapter during 0.x.

**Architecture:** Event owns envelope validation, Event-only registry entries, sessions, subscriptions, routing, and transport contracts. Recovery delivery, Governance policy, Task lifecycle, State, Context/Memory, and Delegation remain out of scope. Registry and payload-schema ownership must be split before file moves; gRPC wire artifacts remain unchanged until an explicit compatibility decision.

**Tech Stack:** ESM JavaScript/npm workspaces, Python packages, Go subpackages, Java packages, JSON Schema, NDJSON fixtures, existing conformance runner.

---

### Task 1: Freeze Event contract and classify mixed legacy APIs

**Files:**
- Modify: `docs/protocol/event-contract.md`
- Modify: `docs/protocol/compatibility-matrix.md`
- Create: `conformance/fixtures/event-core.ndjson`
- Modify: `conformance/manifest.json`

- [ ] **Step 1: Define Event-only registry ownership**

Add an Event registry table to `event-contract.md` listing only envelope/session/subscription/routing/transport control types. State that Task, State, Context/Memory, Delegation, Recovery, and Governance types are owned by their dimension modules and are not Event registry entries.

- [ ] **Step 2: Record non-movable mixed surfaces**

Add compatibility matrix rows for `aep-payloads.schema.json`, `errors` helpers, and `aep.proto`. Mark payload schemas and errors as shared contracts; mark `.proto` filename/service/message identifiers as wire-decision blocked.

- [ ] **Step 3: Add Event core fixture**

Create a valid NDJSON trace with session open/ready, subscription creation, event routing, and subscription cancellation. Declare it with an existing positive expectation at the Event/core conformance level.

- [ ] **Step 4: Verify fixture in all implementations**

```powershell
npm test
python -m pytest
go test ./...
mvn test
node tools/conformance-runner.js
```

Expected: existing legacy implementations accept the Event trace before extraction begins.

- [ ] **Step 5: Commit Event contract freeze**

```bash
git add docs/protocol conformance
```

### Task 2: Extract Event core modules in all languages

**Files:**
- Create: `implementations/typescript/packages/event/src/{index,registry,session,subscription,router}.js`
- Create: `implementations/typescript/packages/event/src/envelope/{validate,schema}.js`
- Create: `implementations/python/src/axisrobo_harmovela_event/{__init__,registry,session,subscription,router}.py`
- Create: `implementations/python/src/axisrobo_harmovela_event/envelope/{__init__,validate,schema}.py`
- Create: `implementations/go/event/{registry,envelope,session,subscription,router}.go`
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/event/{registry,envelope,session,subscription,router}/`
- Modify: legacy `aep` barrels/harness/runtime imports in each language

- [ ] **Step 1: Copy existing Event tests to module test locations and run RED**

Move envelope, session, subscription, and router tests to the corresponding Event module test locations. Update imports to the new public Event APIs.

- [ ] **Step 2: Move Event core implementations without importing `aep`**

Move the exact Event implementations. Replace legacy relative imports with Event-internal imports or shared contract imports. Do not move task/recovery/governance event types into Event registry.

- [ ] **Step 3: Turn legacy exports into one-way adapters**

Update `aep` barrels/harness/runtime to import Event public APIs. No Event module may import `aep`.

- [ ] **Step 4: Run Event tests GREEN and dependency checks**

```powershell
npm test
python -m pytest
go test ./...
mvn test
rg -n "\baep\b|com\.axisrobo\.aep" implementations/typescript/packages/event implementations/python/src/axisrobo_harmovela_event implementations/go/event implementations/java/src/main/java/com/axisrobo/harmovela/event
```

Expected: all suites pass; dependency search finds no legacy implementation import in Event modules.

- [ ] **Step 5: Commit Event core extraction**

```bash
git add implementations
```

### Task 3: Extract Event transport modules without wire renames

**Files:**
- Create Event transport modules for stdio, WebSocket, SSE, gRPC wrappers, NATS, Kafka, Redis in each language's Event module
- Modify legacy runtime/CLI/bridge imports to use Event transport public APIs
- Keep: `aep.proto`, generated binding identifiers, legacy endpoint/subprotocol values unchanged pending compatibility decision

- [ ] **Step 1: Move transport tests to Event transport module test locations and run RED**

Preserve current transport behavior tests; update imports to new Event transport APIs.

- [ ] **Step 2: Move transport implementations and update adapters**

Each Event transport implementation may depend on Event contract only. Delivery/replay behavior remains Recovery-owned and must be injected, not imported from `aep`.

- [ ] **Step 3: Run transport and full verification**

```powershell
npm test
python -m pytest
go test ./...
mvn test
node tools/conformance-runner.js
```

Expected: all transports preserve existing behavior and shared Event fixture passes everywhere.

- [ ] **Step 4: Commit Event transport extraction**

```bash
git add implementations conformance
```

### Task 4: Record Event migration evidence

**Files:**
- Modify: `docs/protocol/compatibility-matrix.md`
- Modify: `docs/superpowers/specs/2026-07-13-dimension-first-aep-removal-design.md`

- [ ] **Step 1: Record migrated surfaces**

For every Event surface, record new module location, legacy adapter behavior, Event fixture evidence, and 1.0 removal gate. Do not declare a Protocol release.

- [ ] **Step 2: Verify version-governance compliance**

```powershell
rg -n "Event|adapter|fixture|1\.0 removal|Protocol" docs/protocol/compatibility-matrix.md docs/superpowers/specs/2026-07-13-dimension-first-aep-removal-design.md
git diff --check
```

- [ ] **Step 3: Commit Event migration evidence**

```bash
git add docs/protocol docs/superpowers/specs
```
