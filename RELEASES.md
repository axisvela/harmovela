# Harmovela Protocol Releases

> Current version: **1.0.0**

## Release Phases

Harmovela follows a phased release model toward 1.0. Each phase has documented entry and exit criteria derived from [`design/roadmap.md`](design/roadmap.md).

### 0.1 — Draft

| Attribute | Detail |
|---|---|
| **Status** | Delivered |
| **Goal** | Produce a minimal, implementable protocol specification with multi-language reference implementations |
| **Entry criteria** | Vision, architecture, and design documents drafted |
| **Exit criteria** | Event envelope, session, subscription, task lifecycle, error model, versioning, and transport binding specifications complete; four language references passing cross-language conformance |
| **Deliverables** | 17 specifications, 4 conformance levels (C0–C3), 7 cross-language fixtures, 7 transport bindings, ~700 tests across four languages, published spec site |

### 0.2 — Core Migration

| Attribute | Detail |
|---|---|
| **Status** | Delivered |
| **Goal** | Establish the Harmovela protocol identity and freeze the minimum interoperable coordination core |
| **Entry criteria** | 0.1 draft complete with passing cross-language conformance |
| **Exit criteria** | Protocol identity consistently documented; legacy technical identifiers have explicit compatibility policy; envelope, session, subscription, task lifecycle, errors, correlation, version negotiation, and delivery semantics frozen; internally consistent conformance levels |
| **Scope** | Public identity transition from AEP to Harmovela; naming and namespace rules; governance, release, trademark, and licensing documentation; core semantics freeze |

### 0.3 — Profiles

| Attribute | Detail |
|---|---|
| **Status** | Delivered |
| **Entry criteria** | 0.2 core stabilization complete |
| **Exit criteria** | Profile model defined with identifier, dependencies, capability negotiation, versioning, and conformance fixture requirements; at least one optional profile fully specified with fixtures |
| **Scope** | Runtime semantics profile, durable delivery profile, security profile, transport-specific capability profiles |

### 0.4 — Beta

| Attribute | Detail |
|---|---|
| **Status** | Delivered |
| **Goal** | Attract independent implementations and community feedback with a stable, well-documented coordination core |
| **Entry criteria** | 0.3 profiles complete; frozen core with published compatibility policy; passing cross-language conformance (TypeScript, Go); three documented integration scenarios (async task, context/memory, MCP bridge); public conformance matrix; governance, release, trademark, and license documentation |
| **Exit criteria** | At least two independently maintained interoperable implementations; no unremediated core conformance regressions; community governance proposal published |
| **Scope** | External implementation support; community governance; scenario expansion |

### 0.5 — Adaptation Preview

| Attribute | Detail |
|---|---|
| **Status** | Delivered |
| **Goal** | Specify and implement normative feedback/outcome correlation; security-profile-dependent adaptation-operation authority, audit linkage, and authorization checks; the L3 adaptation profile; and cross-language conformance fixtures |
| **Entry criteria** | The L2 coordination profile is interoperable at 0.4 |
| **Exit criteria** | Feedback/outcome and adaptation-operation specifications, an L3 profile declaration that depends on `harmovela.security.v1`, and shared fixtures published; the existing Security Profile retains base HARMOVELA-C0/C1 identity, authorization, audit, and tenant-isolation behavior; adaptation-operation semantics identify authority and audit linkage for feedback/outcome and budget establishment, change, enforcement, and violation; budget semantics identify the enforcement point and observable limit-approaching and limit-exceeded outcomes; authorization checks cover feedback/outcome and budget establishment, change, enforcement, and violation operations; every reference implementation passes the declared L3 fixtures |
| **Deliverables** | 11 adaptation event types defined and registered; budget enforcement semantics integrated with the harness; 4 cross-language adaptation conformance fixtures pass across all reference implementations |
| **Scope** | The L3 profile depends on `harmovela.security.v1`, which owns base HARMOVELA-C0/C1 identity, authorization, audit, and tenant isolation; L3 adds adaptation-operation authority and audit linkage for feedback/outcome and budget establishment, change, enforcement, and violation, and authorization checks for those operations; L3 profile identifier, dependencies, capability negotiation, versioning, and conformance; positive and negative L3 fixtures for outcome correlation, authorized and unauthorized feedback/outcome and budget establishment, change, enforcement, and violation operations, limits, and adaptation-operation audit linkage |

### 0.9 — Release Candidate

| Attribute | Detail |
|---|---|
| **Status** | Superseded by 1.0 |
| **Goal** | Validate the complete 0.5 L3 semantics without feature expansion |
| **Entry criteria** | 0.5 L3 specifications and fixtures are complete; no unresolved breaking core, L2, or L3 semantic changes remain |
| **Exit criteria** | The compatibility matrix covers two implementations maintained in distinct public repositories by distinct maintainers, one declared versioned L3 profile, one named and versioned existing transport profile, one named and versioned topology identifier distinct from that transport profile, and an official versioned L3 fixture/scenario suite; each matrix row records both the transport profile and topology identifier with their versions; required matrix cells are each implementation x the selected L3 profile x the selected topology identifier and version x every official fixture/scenario; every cell passes; a `release-blocker` is an open issue tagged by the designated release maintainer in the public tracker, and zero `release-blocker` issues may remain; public governance, release, security-response, and registry processes are published; an external L3 autonomy pilot has an operator who is not a maintainer of either participating implementation, and its published report identifies both implementation names and versions, the L3 profile and version, transport profile and version, topology identifier and version, and official fixture/scenario-suite version; it publishes per-fixture and per-scenario pass/fail results demonstrating the feedback/outcome, budget, audit, and authorization boundaries, all of which pass; a generic interoperability pilot does not satisfy this gate; no new protocol features are added during the RC period |
| **Scope** | Validation-only RC fixtures and reproducible compatibility matrix, governance/security/registry processes, and external L3 autonomy pilot |

> **Note:** 0.9's in-repository validation evidence (34-fixture x 4-language matrix, 136 cells) was completed, but its external-evidence exit gates (two independently maintained implementations, external L3 autonomy pilot, zero independently-reviewed `release-blocker` issues) were not satisfied when 1.0 was declared. By explicit compatibility decision (recorded in `design/release/release-notes-v1.0.0.md`), 1.0 was released as a wire-compatible declaration, and the remaining external-evidence gates were carried forward to 1.1.

### 1.0

| Attribute | Detail |
|---|---|
| **Status** | Delivered |
| **Goal** | Publish stable L3 coordination semantics with a documented boundary declaring L4 and AGI as non-goals |
| **Entry criteria** | 0.5 L3 specifications and fixtures are complete; no unresolved breaking core, L2, or L3 semantic changes remain |
| **Exit criteria** | By explicit compatibility decision (see `design/release/release-notes-v1.0.0.md`), the 0.9 external-evidence gates (two independently maintained implementations, external L3 autonomy pilot, zero independently-reviewed `release-blocker` issues) were exempted and deferred to 1.1. Released 1.0 as a wire-compatible Protocol declaration: the envelope `spec_version` remains `0.2`; profiles, schemas, and wire identifiers are unchanged. Stable feedback/outcome correlation and budget, audit, and authorization boundaries; documented governance, release, licensing, trademark, upgrade, and deprecation policies; a published boundary declaring L4 open-ended autonomy and AGI as explicit non-goals |
| **Deliverables** | Protocol 1.0 release declaration (`v1.0.0`), release notes, updated release records and roadmap reflecting the exemption and the deferred 1.1 gates |

### 1.1 — External Evidence

| Attribute | Detail |
|---|---|
| **Status** | Planned |
| **Goal** | Close the external-evidence gates deferred from the 0.9 RC by explicit compatibility decision when 1.0 was released |
| **Entry criteria** | 1.0 released; compatibility matrix covers all required implementation, profile, transport, topology, fixture, and scenario cells in-repository |
| **Exit criteria** | The compatibility matrix covers two implementations maintained in distinct public repositories by distinct maintainers, one declared versioned L3 profile, one named and versioned existing transport profile, one named and versioned topology identifier distinct from that transport profile, and an official versioned L3 fixture/scenario suite; each matrix row records both the transport profile and topology identifier with their versions; required matrix cells are each implementation x the selected L3 profile x the selected topology identifier and version x every official fixture/scenario; every cell passes; a `release-blocker` is an open issue tagged by the designated release maintainer in the public tracker, and zero `release-blocker` issues may remain; public governance, release, security-response, and registry processes are published; an external L3 autonomy pilot has an operator who is not a maintainer of either participating implementation, and its published report identifies both implementation names and versions, the L3 profile and version, transport profile and version, topology identifier and version, and official fixture/scenario-suite version; it publishes per-fixture and per-scenario pass/fail results demonstrating the feedback/outcome, budget, audit, and authorization boundaries, all of which pass; a generic interoperability pilot does not satisfy this gate; no new protocol features are added during the validation period |
| **Scope** | Independent-implementation evidence, external L3 autonomy pilot, release-blocker review; governance/security/registry process applicability review |

## Breaking Changes Policy

Before 1.0, breaking changes to the protocol envelope, required event families, delivery semantics, or conformance expectations are permitted. All breaking changes must:

1. Be documented in the release notes for the version that introduces them.
2. Include migration guidance for implementations affected by the change.
3. Update conformance fixtures to reflect the new expectations.
4. Be reflected in all language reference implementations before the release is tagged.

After 1.0, breaking changes follow the deprecation policy defined in `design/protocol/versioning.md`.

## Release Artifacts

Each versioned release produces the following artifacts:

| Artifact | Description |
|---|---|
| **Spec site** | Rendered HTML specification at `https://axisrobo.github.io/harmovela/`, version-pinned |
| **Schemas** | JSON Schema assets in `schemas/`, tagged with the release version |
| **Conformance fixtures** | Shared cross-language fixtures in `conformance/fixtures/`, tagged with the release version |
| **Implementation tags** | Git tags on each language implementation directory (e.g., `implementations/typescript`, `implementations/python`, `implementations/go`, `implementations/java`) |
| **Release notes** | Per-version changelog documenting additions, changes, deprecations, and migration guidance |

## Versioning

Protocol versioning follows `design/protocol/versioning.md`. The protocol envelope `spec_version` field uses `MAJOR.MINOR` format. Release phase numbers correspond to the protocol version.

> **Git tag axis note:** the `v0.6.0` git tag is an **implementation/milestone** tag (protocol boundary documentation and Go harness coordination fix), not a Protocol release. It does not advance the Protocol version and does not appear in the release path above. Implementation tags must not be read as Protocol releases.

## Related Documents

- [Governance](GOVERNANCE.md) (`GOVERNANCE.md`) — project governance and decision-making
- [Roadmap](design/roadmap.md) — detailed phase descriptions and milestones
- [1.0 release notes](design/release/release-notes-v1.0.0.md) — release declaration, compatibility decision, and deferred-gate record
- [0.9 RC validation kit](design/release/rc-validation.md) — freeze rules, test matrix, evidence templates, and compatibility snapshot (historical; gates superseded and carried to 1.1)
- [Versioning](design/protocol/versioning.md) — protocol versioning rules
- [Trademarks](TRADEMARKS.md) (`TRADEMARKS.md`) — name and mark usage
