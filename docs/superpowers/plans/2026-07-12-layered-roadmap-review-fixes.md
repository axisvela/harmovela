# Layered Roadmap Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the Harmovela layered roadmap's release sequencing, gates, historical classification, profile status, and conformance terminology.

**Architecture:** Retain the existing four-file roadmap. Keep Event as the delivered communication substrate, make Coordination own L1–L2 semantics and release gates, and add 0.5 Adaptation Preview so L3 artifacts exist before the 0.9 validation-only release candidate. This is documentation-only work: it must not change protocol behavior, schemas, wire identifiers, or implementation code.

**Tech Stack:** Markdown, repository documentation links, `rg`, Git.

---

### Task 1: Correct the roadmap index and event-layer history

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/roadmap/event-layer.md`
- Reference: `conformance/manifest.json:1-9`
- Reference: `docs/protocol/conformance.md:48-67`

- [ ] **Step 1: Replace obsolete current conformance names**

In `docs/roadmap.md` and `docs/roadmap/event-layer.md`, replace statements that call `AEP-C3` the current default conformance target with:

```markdown
The default conformance target is `HARMOVELA-C3`.
```

Retain `AEP-C*` only where discussing legacy technical identifiers under the 0.1 compatibility transition. Do not rename actual paths such as `schemas/aep-envelope.schema.json`.

- [ ] **Step 2: Reclassify delivered work by maturity layer**

In `docs/roadmap/event-layer.md`, remove delegation, authorization, tenant isolation, governance, and agent-runtime semantics from the Event-layer achievement record. Keep envelope, session, subscription, task stream, transport, delivery/reliability, MCP bridge, and conformance work. Add a short cross-cutting note:

```markdown
Identity, authorization, audit, tenant isolation, and registry governance are cross-cutting governance foundations. Delegation and runtime semantics are recorded in the Coordination layer because they establish multi-agent behavior above the event substrate.
```

In `docs/roadmap.md`, add a corresponding one-line explanation that layer documents classify historical work by the capability it enables, not the chronological phase that originally delivered it.

- [ ] **Step 3: Add the adaptation-preview release row**

In the `docs/roadmap.md` release table, insert this row between 0.4 and 0.9:

```markdown
| **0.5 Adaptation Preview** | Adaptation | L3 (specified and testable) | Define feedback/outcome correlation and protocol-level budget authority, enforcement, and violation semantics; publish the L3 profile and cross-language conformance fixtures. |
```

Change the sentence below the release table to say that layer documents contain release-specific **entry and exit** gates.

- [ ] **Step 4: Verify terminology and history classification**

Run:

```powershell
rg -n "AEP-C3|HARMOVELA-C3|delegation|authorization|tenant isolation|runtime semantics" docs/roadmap.md docs/roadmap
```

Expected: `HARMOVELA-C3` is the sole current conformance target; `AEP-C3` appears only in an explicit legacy-compatibility statement; Event history no longer presents delegation or governance as L0 substrate.

- [ ] **Step 5: Commit the index and history correction**

```bash
git add docs/roadmap.md docs/roadmap/event-layer.md
git commit -m "docs: correct Harmovela roadmap foundation history"
```

### Task 2: Define Coordination-layer boundaries and release gates

**Files:**
- Modify: `docs/roadmap/coordination-layer.md`
- Reference: `docs/protocol/profiles.md:124-171`
- Reference: `docs/protocol/conformance.md:61-67`

- [ ] **Step 1: Define the L1/L3 budget boundary**

Replace the L1 policy-surface budget wording with a distinction that cannot be mistaken for L3 enforcement:

```markdown
At L1, a budget is an advisory, implementer-supplied declaration (for example cost, time, or action count). It may bound one runtime's behavior, but Harmovela does not yet define portable enforcement, authority, violation events, or conformance for it. Those become L3 Adaptation-layer requirements.
```

- [ ] **Step 2: Correct the 0.3 profile scope**

Replace the 0.3 focus with:

```markdown
Tighten delegation, handoff, escalation, and cancellation propagation into a conformance-tested L2 coordination profile; add missing security-profile declarations and fixtures. Delivery and security profile definitions already exist and are not rescheduled here.
```

- [ ] **Step 3: Replace layer-wide criteria with release-specific gates**

Replace the single `## Exit Criteria` section with `## Release Gates` and these three subsections:

```markdown
### 0.2 Core Stabilization

Entry criteria:
- A public Harmovela identity and compatibility policy for legacy technical identifiers.

Exit criteria:
- Frozen L0–L1 core: envelope, session, subscription, task lifecycle, errors, correlation, version negotiation, and declared delivery semantics.
- Shared positive and negative lifecycle fixtures cover acceptance, progress, blocked work, terminal outcomes, cancellation, replay, acknowledgement, and invalid transitions.
- Conformance levels, manifest expectations, and the default runner target are internally consistent.
- The L1 advisory policy surface is documented and capability-negotiable.

### 0.3 Optional Profiles

Entry criteria:
- 0.2 core compatibility policy and lifecycle fixtures are published.

Exit criteria:
- The L2 coordination profile defines its identifier, dependencies, capability negotiation, versioning, and conformance fixtures.
- Delegation, ownership transfer, handoff, escalation, and cancellation propagation have positive and negative fixtures.
- Implementations can declare and filter conformance by profile.
- Security-profile declarations and fixtures cover authorization, audit, and tenant-isolation behavior already defined by the security profile.

### 0.4 Beta

Entry criteria:
- 0.3 profile declarations and fixtures are complete.
- The frozen core has a published compatibility policy.

Exit criteria:
- At least two independently maintained implementations interoperate at the L2 coordination profile.
- Passing cross-language conformance covers the declared core and L2 profile.
- A public conformance matrix and three documented integration scenarios are published.
- No unremediated core or L2 conformance regressions remain.
- A community governance proposal is published.
```

- [ ] **Step 4: Verify profile claims against protocol documentation**

Run:

```powershell
rg -n "Delivery Profile|Security Profile|Runtime Semantics Profile|delegation" docs/protocol/profiles.md docs/roadmap/coordination-layer.md
```

Expected: the roadmap correctly treats delivery and security profile definitions as existing work, and schedules only missing L2 coordination and security-fixture work.

- [ ] **Step 5: Commit Coordination release gates**

```bash
git add docs/roadmap/coordination-layer.md
git commit -m "docs: define Coordination release gates"
```

### Task 3: Sequence L3 adaptation work before the release candidate

**Files:**
- Modify: `docs/roadmap/adaptation-layer.md`
- Reference: `docs/protocol/profiles.md:143-171`

- [ ] **Step 1: Add a normative 0.5 Adaptation Preview scope**

Before the release-mapping table, add a section that defines 0.5 deliverables:

```markdown
## 0.5 Adaptation Preview Deliverables

- A feedback/outcome event specification that correlates each outcome to its task, goal, delegation chain, authority, and declared or consumed cost.
- Budget semantics defining the authority that establishes a budget, the enforcement point, and limit-approaching and limit-exceeded events.
- An L3 adaptation profile defining identifier, dependencies, capability negotiation, versioning, and conformance requirements.
- Shared positive and negative fixtures for outcome correlation, authorized and unauthorized budget changes, limit approach, limit exceedance, and audit linkage.
```

- [ ] **Step 2: Replace the release table with explicitly sequenced releases**

Use these rows:

```markdown
| **0.5 Adaptation Preview** | Specify and implement feedback/outcome correlation, budget authority/enforcement/violation semantics, L3 adaptation-profile declaration, and cross-language conformance fixtures. | L3 (specified and testable) |
| **0.9 Release Candidate** | Validate the complete 0.5 L3 semantics without feature expansion through RC fixtures, compatibility matrix, governance/security/registry processes, and at least one external autonomy pilot. | L3 (validated) |
| **1.0** | Publish stable L3 coordination semantics with a documented boundary declaring L4 and AGI as non-goals. | L3 (stable) |
```

- [ ] **Step 3: Add release-specific gates**

Replace `## Exit Criteria (for 1.0)` with:

```markdown
## Release Gates

### 0.5 Adaptation Preview

Entry criteria:
- The L2 coordination profile is interoperable at 0.4.

Exit criteria:
- Feedback/outcome and budget specifications, L3 profile declaration, and shared fixtures are published.
- Budget semantics identify authority, enforcement point, and observable limit-approaching and limit-exceeded outcomes.
- Every reference implementation passes the declared L3 fixtures.

### 0.9 Release Candidate

Entry criteria:
- 0.5 L3 specifications and fixtures are complete.
- No unresolved breaking core, L2, or L3 semantic changes remain.

Exit criteria:
- Release-candidate fixtures and a public compatibility matrix pass across declared implementations.
- Public governance, release, security-response, and registry processes are published.
- At least one external deployment or interoperability pilot validates the L3 profile.
- No new protocol features are added during the RC period.

### 1.0

Release criteria:
- Stable feedback/outcome correlation and budget, audit, and authorization boundaries.
- Repeatable conformance results across independently maintained implementations.
- Documented governance, release, licensing, trademark, upgrade, and deprecation policies.
- A published boundary declaring L4 open-ended autonomy and AGI as explicit non-goals.
```

- [ ] **Step 4: Verify L3 sequencing and claims**

Run:

```powershell
rg -n "0\.5|0\.9|feedback|outcome|budget|authority|enforcement|fixture|no new" docs/roadmap/adaptation-layer.md docs/roadmap.md
```

Expected: L3 normative work is owned by 0.5; 0.9 is validation-only; every release has observable gates.

- [ ] **Step 5: Commit adaptation sequencing**

```bash
git add docs/roadmap.md docs/roadmap/adaptation-layer.md
git commit -m "docs: sequence Harmovela L3 adaptation milestones"
```

### Task 4: Perform final roadmap consistency verification

**Files:**
- Verify: `docs/roadmap.md`
- Verify: `docs/roadmap/event-layer.md`
- Verify: `docs/roadmap/coordination-layer.md`
- Verify: `docs/roadmap/adaptation-layer.md`

- [ ] **Step 1: Verify local Markdown targets exist**

Run:

```powershell
Test-Path docs/roadmap/event-layer.md, docs/roadmap/coordination-layer.md, docs/roadmap/adaptation-layer.md, docs/design/2026-07-12-layered-roadmap-design.md, docs/design/2026-07-12-layered-roadmap-review-fixes-design.md
```

Expected: five `True` values.

- [ ] **Step 2: Verify canonical terminology and release gates**

Run:

```powershell
rg -n "AEP-C3|HARMOVELA-C3|0\.5 Adaptation Preview|Entry criteria|Exit criteria|Release criteria" docs/roadmap.md docs/roadmap
```

Expected: `HARMOVELA-C3` is canonical; `AEP-C3` occurs only as a labeled legacy identifier; 0.2, 0.3, 0.4, 0.5, 0.9, and 1.0 each have release-specific gates.

- [ ] **Step 3: Verify Markdown and Git state**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors; only intended roadmap changes before the final commit.
