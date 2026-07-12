# Harmovela Protocol Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transition the public protocol identity to Harmovela and establish versioned gates from the current draft through 1.0.

**Architecture:** Treat naming, wire identity, package artifact identity, and repository identity as separate versioned surfaces. Axisrobo remains the package and group namespace. Publish Harmovela as the formal protocol identity first, then migrate technical identifiers only through explicit compatibility decisions and conformance coverage.

**Tech Stack:** Markdown specifications, JSON Schema, TypeScript, Python, Go, Java, shared conformance fixtures, GitHub Actions.

---

### Task 1: Establish public protocol identity

**Files:**
- Modify: `README.md`
- Modify: `README_zh.md`
- Modify: `docs/vision.md`
- Modify: `docs/architecture.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/design/2026-07-12-harmovela-protocol-design.md`

- [ ] **Step 1: Add the approved formal name to the project overview**

Use `Harmovela Protocol` as the formal name and describe it as an open coordination protocol for autonomous systems. Keep the existing draft wire behavior unchanged in this step.

- [ ] **Step 2: Align the Chinese overview and core architecture language**

Replace project-facing terminology consistently in `README_zh.md`, `docs/vision.md`, and `docs/architecture.md`. Preserve the distinction between synchronous capability invocation and asynchronous coordination.

- [ ] **Step 3: Verify public terminology consistency**

Run: `rg -n "Agent Event Protocol|AEP|Harmovela" README.md README_zh.md docs/vision.md docs/architecture.md docs/roadmap.md`

Expected: Harmovela is the formal project identity; any remaining legacy identifier has an explicit transition role.

- [ ] **Step 4: Commit the identity documentation**

```bash
git add README.md README_zh.md docs/vision.md docs/architecture.md docs/roadmap.md docs/design/2026-07-12-harmovela-protocol-design.md
git commit -m "docs: establish Harmovela protocol identity"
```

### Task 2: Define technical identifier migration

**Files:**
- Modify: `schemas/aep-envelope.schema.json`
- Modify: `schemas/aep-payloads.schema.json`
- Modify: `docs/protocol/versioning.md`
- Modify: `docs/protocol/conformance.md`
- Modify: `conformance/manifest.json`
- Modify: `implementations/typescript/src/event-types.js`
- Modify: `implementations/python/src/aep/event_types.py`
- Modify: `implementations/go/aep/event_types.go`
- Modify: `implementations/java/src/main/java/com/axisrobo/aep/EventTypes.java`

- [ ] **Step 1: Inventory every wire and schema identifier containing the legacy name**

Run: `rg -n "aep_version|AEP-C[0-9]|@axisrobo/aep|github.com/axisrobo/aep|aep-" schemas conformance implementations docs/protocol`

Expected: A reviewed inventory separating externally serialized fields, package artifact names, schema URIs, conformance levels, transport defaults, and internal symbols.

- [ ] **Step 2: Write the compatibility decision before editing schemas**

Document whether the existing envelope version field remains supported through 0.x, the first version that introduces a neutral protocol identifier, and the exact reader behavior for both forms. Preserve the `axisrobo` package and group namespace while deciding each artifact's public name.

- [ ] **Step 3: Add shared positive and negative conformance fixtures**

Create fixtures that prove the accepted legacy and new identifier forms. Add malformed or unsupported-version fixtures for rejected forms.

- [ ] **Step 4: Update all four language implementations together**

Apply the approved identifier rules to TypeScript, Python, Go, and Java. Each implementation must produce equivalent validation and rejection behavior.

- [ ] **Step 5: Verify cross-language compatibility**

Run: `node tools/conformance-runner.js`

Expected: Every configured language passes every fixture at the target conformance level.

- [ ] **Step 6: Commit the identifier migration**

```bash
git add schemas conformance docs/protocol implementations tools
git commit -m "feat: add Harmovela protocol identifiers"
```

### Task 3: Stabilize the minimal core for beta

**Files:**
- Modify: `docs/protocol/session.md`
- Modify: `docs/protocol/subscription.md`
- Modify: `docs/protocol/task-lifecycle.md`
- Modify: `docs/protocol/error-model.md`
- Modify: `docs/protocol/versioning.md`
- Modify: `docs/protocol/delivery.md`
- Modify: `docs/protocol/conformance.md`
- Modify: `conformance/manifest.json`

- [ ] **Step 1: Define the required 1.0 core surface**

Mark envelope, session, subscription, task lifecycle, error model, version negotiation, correlation, and declared delivery semantics as core. Mark runtime semantics and transport-specific capabilities as optional profiles unless independently promoted.

- [ ] **Step 2: Make conformance levels internally consistent**

Define every advertised level in `docs/protocol/conformance.md`, assign fixtures in `conformance/manifest.json`, and make the documented default target match the runner behavior.

- [ ] **Step 3: Add lifecycle transition fixtures**

Cover accepted work, progress, blocked work, terminal outcomes, cancellation, replay, acknowledgement, and invalid transitions.

- [ ] **Step 4: Verify all reference implementations**

Run: `node tools/conformance-runner.js`

Expected: The shared matrix reports a pass for every required core fixture in each implementation.

- [ ] **Step 5: Commit core stabilization**

```bash
git add docs/protocol conformance schemas implementations tools
git commit -m "docs: define Harmovela beta core"
```

### Task 4: Publish optional coordination profiles

**Files:**
- Modify: `docs/protocol/agent-runtime-semantics.md`
- Modify: `docs/protocol/security.md`
- Modify: `docs/protocol/event-registry-governance.md`
- Create: `docs/protocol/profiles.md`

- [ ] **Step 1: Create a profile catalog**

Define profile identifiers, dependencies, capability negotiation, versioning, and conformance requirements for runtime semantics, durable delivery, security, and transport bindings.

- [ ] **Step 2: Classify existing optional features**

Place belief, freshness, delegation, interruption, compensation, provenance, durability, and transport-specific behavior in documented profiles without making them universal 1.0 requirements.

- [ ] **Step 3: Add profile conformance declarations**

Extend the manifest so an implementation can declare its core level and optional profiles. Add at least one fixture per profile.

- [ ] **Step 4: Verify declared profiles**

Run: `node tools/conformance-runner.js`

Expected: The runner distinguishes core failures from optional-profile failures and reports the declared profile matrix.

- [ ] **Step 5: Commit profile boundaries**

```bash
git add docs/protocol conformance implementations tools
git commit -m "docs: define Harmovela coordination profiles"
```

### Task 5: Meet beta, RC, and 1.0 release gates

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/protocol/conformance.md`
- Modify: `docs/protocol/versioning.md`
- Modify: `CONTRIBUTING.md`
- Create: `GOVERNANCE.md`
- Create: `RELEASES.md`
- Create: `TRADEMARKS.md`
- Create: `LICENSE`

- [ ] **Step 1: Publish beta entry criteria**

Require a frozen core candidate, passing cross-language fixtures, a documented compatibility policy, and at least two independently maintained interoperable implementations before a beta release.

- [ ] **Step 2: Publish RC entry criteria**

Require no unresolved core semantic changes, release-candidate fixtures, a documented security response path, and a public compatibility matrix before an RC release.

- [ ] **Step 3: Publish 1.0 release criteria**

Require stable core semantics, independent implementation evidence, repeatable conformance results, documented governance, a public release policy, and an explicit protocol license and trademark policy.

- [ ] **Step 4: Review release documentation links**

Run: `rg -n "Harmovela|0.5|0.9|1.0|GOVERNANCE|RELEASES|TRADEMARKS|LICENSE" README.md docs CONTRIBUTING.md GOVERNANCE.md RELEASES.md TRADEMARKS.md`

Expected: Release gates and governance documents are linked from the public project entry points.

- [ ] **Step 5: Commit release governance**

```bash
git add README.md docs CONTRIBUTING.md GOVERNANCE.md RELEASES.md TRADEMARKS.md LICENSE
git commit -m "docs: define Harmovela release governance"
```
