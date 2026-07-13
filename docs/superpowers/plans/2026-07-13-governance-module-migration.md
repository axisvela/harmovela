# Governance Module Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Governance policy and tests from legacy `aep` namespaces into independent Harmovela Governance modules in all four languages.

**Architecture:** Preserve the approved RBAC behavior while changing its physical boundary. Governance modules expose public policy APIs and never import `aep`; legacy harnesses later import the Governance APIs as adapters.

**Tech Stack:** TypeScript npm workspace package, Python package, Go subpackage, Java package, existing language test runners.

---

### Task 1: Move Governance policy modules and tests

**Files:**
- Create: `implementations/typescript/packages/governance/src/index.js`
- Create: `implementations/typescript/packages/governance/test/governance.test.js`
- Create: `implementations/typescript/packages/governance/package.json`
- Create: `implementations/python/src/axisrobo_harmovela_governance/__init__.py`
- Create: `implementations/python/src/axisrobo_harmovela_governance/policy.py`
- Create: `implementations/python/tests/test_governance_module.py`
- Create: `implementations/go/governance/policy.go`
- Create: `implementations/go/governance/policy_test.go`
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/governance/GovernancePolicy.java`
- Create: `implementations/java/src/test/java/com/axisrobo/harmovela/governance/GovernancePolicyTest.java`
- Delete after GREEN: legacy Governance policy/test files introduced by `ca3ac0f`

- [ ] **Step 1: Copy existing policy tests into new module test locations**

Keep the exact approved role/action/default-deny expectations. Update imports to each Governance public API.

- [ ] **Step 2: Run new module tests and observe RED**

```powershell
npm test --workspace @axisrobo/harmovela-governance
python -m pytest tests/test_governance_module.py
go test ./governance
mvn -Dtest=com.axisrobo.harmovela.governance.GovernancePolicyTest test
```

Expected: tests fail because Governance public modules do not yet exist.

- [ ] **Step 3: Move policy implementation without changing behavior**

Expose the same `authorize` / `Authorize` / `GovernancePolicy.authorize` contract from the new modules. Governance code must not import `aep`.

- [ ] **Step 4: Run new module tests GREEN**

Run the commands from Step 2. Expected: all policy tests pass.

- [ ] **Step 5: Delete legacy policy files and tests**

Remove `src/governance.js`, `src/aep/governance.py`, `aep/governance.go`, `com.axisrobo.aep.GovernancePolicy`, and their legacy policy tests only after new tests pass.

- [ ] **Step 6: Verify no reverse dependency exists**

```powershell
rg -n "\baep\b|com\.axisrobo\.aep" implementations/typescript/packages/governance implementations/python/src/axisrobo_harmovela_governance implementations/go/governance implementations/java/src/main/java/com/axisrobo/harmovela/governance
```

Expected: no Governance module imports a legacy `aep` implementation.

- [ ] **Step 7: Commit migration**

```bash
git add implementations
```

### Task 2: Adapt legacy harnesses through Governance public APIs

**Files:**
- Modify: `implementations/typescript/src/harness.js`
- Modify: `implementations/python/src/aep/harness.py`
- Modify: `implementations/go/aep/harness.go`
- Modify: `implementations/java/src/main/java/com/axisrobo/aep/Harness.java`

- [ ] **Step 1: Add harness import tests that fail before adapter wiring**

Extend the existing governance fixture assertions so a denied operation proves the harness invoked the Governance module rather than reimplementing policy.

- [ ] **Step 2: Import the public Governance API in each legacy harness**

Use only the new module's public export. Do not copy role maps or authorization decisions into `aep`.

- [ ] **Step 3: Run governance fixture tests**

```powershell
node --test implementations/typescript/test/fixtures.test.js
python -m pytest implementations/python/tests/test_fixtures.py
go test ./aep -run TestConformanceFixtures
mvn -Dtest=ConformanceTest test
```

Expected: current tests remain RED only for not-yet-implemented audit/operation mapping, not missing policy imports.
