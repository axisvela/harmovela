# Harmovela Governance Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement conformance-tested RBAC authorization, default-deny tenant isolation, and audit linkage in all four Harmovela reference harnesses.

**Architecture:** Add the same small policy contract to TypeScript, Python, Go, and Java harnesses. A policy resolves actor roles to standard actions, rejects missing identity/role/tenant permission with `event.rejected` and `unauthorized`, and records audit decisions. Shared fixtures prove equivalent outcomes.

**Tech Stack:** TypeScript, Python, Go, Java, NDJSON fixtures, JSON Schema, existing cross-language conformance harnesses.

---

### Task 1: Define shared governance fixtures and RED assertions

**Files:**
- Create: `conformance/fixtures/governance-contract.ndjson`
- Modify: `conformance/manifest.json`
- Modify: `implementations/typescript/test/fixtures.test.js`
- Modify: `implementations/python/tests/test_fixtures.py`
- Modify: `implementations/go/aep/conformance_test.go`
- Modify: `implementations/java/src/test/java/com/axisrobo/aep/ConformanceTest.java`

- [ ] **Step 1: Preserve and complete failing fixture assertions**

Assert that the manifest declares `governance-contract.ndjson` and that the fixture result includes: same-tenant publish allowed, missing-role rejected with `unauthorized`, cross-tenant rejected by default, cross-tenant allowed only by `cross-tenant-operator`, and audit decision linkage.

- [ ] **Step 2: Run the RED fixture tests**

```powershell
node --test implementations/typescript/test/fixtures.test.js
python -m pytest implementations/python/tests/test_fixtures.py
go test ./aep -run TestConformanceFixtures
mvn -Dtest=ConformanceTest test
```

Expected: failures identify absent fixture declarations or absent authorization enforcement.

- [ ] **Step 3: Add the fixture and manifest declaration**

Create fixture events that carry `actor_id`, `tenant_id`, `roles`, requested action, target tenant, and correlation identifiers. Declare a new `governance_flow` expectation only after every runner implements it in Task 3.

### Task 2: Add identical RBAC policy contracts

**Files:**
- Create: `implementations/typescript/src/governance.js`
- Create: `implementations/python/src/aep/governance.py`
- Create: `implementations/go/aep/governance.go`
- Create: `implementations/java/src/main/java/com/axisrobo/aep/GovernancePolicy.java`

- [ ] **Step 1: Write failing unit tests for role/action and tenant rules**

Cover `viewer` subscribe allow, `publisher` publish/task-submit allow, missing role deny, same-tenant allow, cross-tenant deny, and `cross-tenant-operator` allow.

- [ ] **Step 2: Implement the minimum standard policy**

Implement roles `viewer`, `publisher`, `operator`, `tenant-admin`, `cross-tenant-operator`; actions `event.publish`, `event.subscribe`, `task.submit`, `task.manage`, `governance.audit.read`, `tenant.cross_access`; default tenant deny; return a decision containing `allowed`, `action`, `reason`, and actor/target tenant.

- [ ] **Step 3: Run each language's unit tests**

```powershell
npm test
python -m pytest
go test ./...
mvn test
```

Expected: each policy test passes without altering existing non-governance behavior.

### Task 3: Enforce policy and audit decisions in every harness

**Files:**
- Modify: `implementations/typescript/src/harness.js`
- Modify: `implementations/python/src/aep/harness.py`
- Modify: `implementations/go/aep/harness.go`
- Modify: `implementations/java/src/main/java/com/axisrobo/aep/Harness.java`

- [ ] **Step 1: Route protected operations through the policy**

Resolve action and target tenant before handling publish, subscribe, task submit, and task manage operations. On denial emit the existing `event.rejected` envelope with error code `unauthorized`.

- [ ] **Step 2: Record audit linkage**

Record actor, actor tenant, action, target resource, target tenant, allow/deny decision, `correlation_id`, and `causation_id` whenever present. Expose the record through each harness's test-visible audit collection only; do not add a new wire event in this milestone.

- [ ] **Step 3: Run the shared governance flow GREEN tests**

Run the four commands from Task 1. Expected: every harness yields the same allow/deny decisions and audit linkage.

### Task 4: Verify cross-language governance conformance

**Files:**
- Modify: `docs/protocol/governance-contract.md`
- Modify: `docs/protocol/conformance.md`

- [ ] **Step 1: Document the implemented fixture expectation**

Define `governance_flow` as requiring the shared RBAC/tenant outcomes and audit fields. State it is a Governance capability, not a Protocol release claim.

- [ ] **Step 2: Run full verification**

```powershell
npm test
python -m pytest
go test ./...
mvn test
node tools/conformance-runner.js
git diff --check
```

Expected: all local suites and the conformance runner pass; no whitespace errors.

- [ ] **Step 3: Commit the governance enforcement milestone**

```bash
git add conformance implementations docs/protocol
```
