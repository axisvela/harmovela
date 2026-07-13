# Harmovela Contract Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the versioned compatibility evidence and language-neutral Event/Governance contracts required before splitting legacy `aep` implementations into independent Harmovela dimension packages.

**Architecture:** This is the first migration milestone, not a Protocol release. It does not rename wire fields, packages, CLIs, endpoints, or schemas. It inventories those legacy surfaces, resolves existing contract contradictions by explicit decision records, and defines shared Event/Governance contracts with fixtures before language-specific extraction begins.

**Tech Stack:** Markdown specifications, JSON Schema, shared NDJSON fixtures, TypeScript, Python, Go, Java, cross-language conformance runner.

---

### Task 1: Publish the migration compatibility matrix

**Files:**
- Create: `docs/protocol/compatibility-matrix.md`
- Modify: `docs/protocol/versioning.md`
- Reference: `.superpowers/skills/harmovela-version-governance/SKILL.md`

- [ ] **Step 1: Inventory every public legacy surface**

Run:

```powershell
rg -n "\baep\b|AEPD_|AEP_|aep_version|/aep|aep-0\.|@axisrobo/aep|com\.axisrobo\.aep" schemas conformance implementations docs/protocol README.md README_zh.md
```

Record each result in `docs/protocol/compatibility-matrix.md` with these columns:

```markdown
| Surface | Axis | Current identifier | Consumer scope | Replacement decision | Compatibility behavior | Decision authority |
| --- | --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 2: Classify version axes without changing identifiers**

Add a `## Version Axes` section to the matrix:

```markdown
- Protocol: Harmovela specification and wire compatibility.
- Profile: independently negotiated capability contracts.
- Implementation: language package, daemon, and CLI artifacts.
- Milestone: project delivery state only.
```

State that the matrix is a decision input and does not itself authorize a rename.

- [ ] **Step 3: Record existing contract contradictions**

Add a `## Blocking Decisions` table with at least these rows:

```markdown
| Decision | Conflicting current sources | Required resolution evidence |
| --- | --- | --- |
| Envelope version field | `spec_version` schema/implementations vs. `aep_version` versioning prose | Approved Protocol compatibility decision and positive/negative fixtures |
| Unknown event handling | versioning opaque-forwarding rule vs. registry validators rejecting unknown types | Approved Event contract and cross-language fixture results |
| Runtime naming surfaces | Harmovela runtime defaults vs. legacy commands, paths, environment variables, and subprotocols | Approved breaking-release migration table |
```

- [ ] **Step 4: Verify the matrix is evidence-based**

Run:

```powershell
rg -n "\| Surface \||spec_version|aep_version|Unknown event handling|Runtime naming surfaces" docs/protocol/compatibility-matrix.md
```

Expected: every required row is present and no replacement is labeled delivered or released.

- [ ] **Step 5: Commit the compatibility matrix**

```bash
git add docs/protocol/compatibility-matrix.md docs/protocol/versioning.md
```

### Task 2: Define language-neutral Event and Governance contracts

**Files:**
- Create: `docs/protocol/event-contract.md`
- Create: `docs/protocol/governance-contract.md`
- Modify: `docs/protocol/profiles.md`
- Reference: `docs/superpowers/specs/2026-07-12-harmovela-dimension-modules-design.md`

- [ ] **Step 1: Define Event module ownership and public contracts**

Write `docs/protocol/event-contract.md` with these mandatory sections:

```markdown
## Ownership
Event owns envelope validation, registry lookup, session lifecycle, subscription matching, routing, and transport contracts.

## Public Contracts
Consumers may validate envelopes, negotiate sessions, create/cancel subscriptions, route envelopes, and use declared transport bindings. Consumers must not import Event implementation internals.

## Dependencies
Event has no dimension-module dependency.
```

Reference existing specifications rather than duplicating their wire fields.

- [ ] **Step 2: Define Governance module ownership and public contracts**

Write `docs/protocol/governance-contract.md` with these mandatory sections:

```markdown
## Ownership
Governance owns identity, authorization, audit, tenant isolation, and policy/budget contracts.

## Public Contracts
Other dimensions consume Governance decisions through documented interfaces. Runtime ingress and egress enforce those decisions; dimensions do not import Governance internals.

## Dependencies
Governance depends only on Event contracts.
```

State that `harmovela.security.v1` supplies the base profile and future L3 work extends only adaptation-operation controls.

- [ ] **Step 3: Register contract ownership in the profile catalog**

Add a non-versioned `## Dimension Contract Ownership` table to `docs/protocol/profiles.md` mapping Event and Governance to the two new contract documents. Do not create or rename profile identifiers.

- [ ] **Step 4: Verify contract boundaries**

Run:

```powershell
rg -n "Event owns|Governance owns|must not import|harmovela\.security\.v1|Dimension Contract Ownership" docs/protocol/event-contract.md docs/protocol/governance-contract.md docs/protocol/profiles.md
```

Expected: Event has no dimension dependency; Governance depends only on Event; security profile linkage is explicit.

- [ ] **Step 5: Commit the contract documents**

```bash
git add docs/protocol/event-contract.md docs/protocol/governance-contract.md docs/protocol/profiles.md
```

### Task 3: Add cross-language contract-preservation fixtures

**Files:**
- Create: `conformance/fixtures/event-contract.ndjson`
- Create: `conformance/fixtures/governance-contract.ndjson`
- Modify: `conformance/manifest.json`
- Modify: `implementations/typescript/test/fixtures.test.js`
- Modify: `implementations/python/tests/test_fixtures.py`
- Modify: `implementations/go/aep/conformance_test.go`
- Modify: `implementations/java/src/test/java/com/axisrobo/aep/ConformanceTest.java`

- [ ] **Step 1: Write failing fixture tests in all four languages**

Add manifest-driven assertions that the new fixtures are present at their declared conformance level and satisfy their declared expectation. The tests must use each language's existing fixture harness, not a test-only validator.

- [ ] **Step 2: Run the new fixture tests and observe RED**

Run:

```powershell
node --test implementations/typescript/test/fixtures.test.js
python -m pytest implementations/python/tests/test_fixtures.py
go test ./aep -run TestConformanceFixtures
mvn -Dtest=ConformanceTest test
```

Expected: each command fails because the fixtures are absent from the manifest.

- [ ] **Step 3: Add minimal shared fixtures and manifest declarations**

Create `event-contract.ndjson` with a valid session, subscription, and routed event trace. Create `governance-contract.ndjson` with valid identity/tenant metadata and one unauthorized action that receives a rejection. Declare each fixture with existing expectation types and profile metadata only after confirming the manifest supports them; otherwise first extend the manifest schema identically in all four runners.

- [ ] **Step 4: Run targeted fixture tests and observe GREEN**

Run the four commands from Step 2.

Expected: every runner accepts the Event trace and enforces the declared Governance rejection according to the same manifest expectations.

- [ ] **Step 5: Run full cross-language verification**

Run:

```powershell
npm test
python -m pytest
go test ./...
mvn test
node tools/conformance-runner.js
```

Expected: all configured implementations pass their local suites and shared runner at the declared target.

- [ ] **Step 6: Commit contract fixtures**

```bash
git add conformance implementations docs/protocol
```

### Task 4: Gate dimension-package extraction

**Files:**
- Modify: `docs/superpowers/specs/2026-07-12-harmovela-dimension-modules-design.md`
- Modify: `docs/roadmap/coordination-layer.md`

- [ ] **Step 1: Add an extraction readiness checklist**

Add this checklist to the architecture design:

```markdown
## Extraction Readiness

- Compatibility matrix has an approved decision for every public legacy surface touched by the extraction.
- Event and Governance contract fixtures pass in all four languages.
- The dimension's public contract, dependencies, profile relationship, and fixture ownership are documented.
- The change has a language-specific migration plan and does not infer a Protocol release from package work.
```

- [ ] **Step 2: Link the Coordination roadmap to the prerequisite**

Add a sentence before Coordination work items:

```markdown
No Coordination dimension may be extracted from a legacy implementation until the Event/Governance contract foundation passes its shared fixtures and the compatibility matrix has an approved decision for every touched public surface.
```

- [ ] **Step 3: Verify governance compliance**

Run:

```powershell
rg -n "Extraction Readiness|compatibility matrix|does not infer a Protocol release|Event/Governance contract" docs/superpowers/specs/2026-07-12-harmovela-dimension-modules-design.md docs/roadmap/coordination-layer.md
```

Expected: extraction preconditions are explicit and distinguish implementation work from Protocol release status.

- [ ] **Step 4: Commit the extraction gate**

```bash
git add docs/superpowers/specs/2026-07-12-harmovela-dimension-modules-design.md docs/roadmap/coordination-layer.md
```
