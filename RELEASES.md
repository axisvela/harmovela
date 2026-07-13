# Harmovela Protocol Releases

> Current version: **0.4.0-beta**

## Release Phases

Harmovela follows a phased release model toward 1.0. Each phase has documented entry and exit criteria derived from [`docs/roadmap.md`](docs/roadmap.md).

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
| **Status** | Current |
| **Goal** | Attract independent implementations and community feedback with a stable, well-documented coordination core |
| **Entry criteria** | 0.3 profiles complete; frozen core with published compatibility policy; passing cross-language conformance (TypeScript, Go); three documented integration scenarios (async task, context/memory, MCP bridge); public conformance matrix; governance, release, trademark, and license documentation |
| **Exit criteria** | At least two independently maintained interoperable implementations; no unremediated core conformance regressions; community governance proposal published |
| **Scope** | External implementation support; community governance; scenario expansion |

### 0.5 — Adaptation Preview

| Attribute | Detail |
|---|---|
| **Status** | Planned |
| **Goal** | Specify and implement normative feedback/outcome correlation; budget, audit, and authorization semantics; the L3 adaptation profile; and cross-language conformance fixtures |
| **Entry criteria** | The L2 coordination profile is interoperable at 0.4 |
| **Exit criteria** | Feedback/outcome, budget, audit, and authorization specifications; L3 profile declaration; and shared fixtures published; budget semantics identify authority, enforcement point, and observable limit-approaching and limit-exceeded outcomes; audit semantics link feedback, adaptation, and budget operations across goal, task, delegation chain, authority, and budget; authorization semantics require protocol-level checks for feedback and adaptation actions and for budget operations; every reference implementation passes the declared L3 fixtures |
| **Scope** | Outcome correlation to task, goal, delegation chain, authority, and declared or consumed cost; budget authority, enforcement, and violation semantics; audit linkage across goal, task, delegation chain, authority, and budget; authorization checks for feedback, adaptation, and budget operations; L3 profile identifier, dependencies, capability negotiation, versioning, and conformance; positive and negative fixtures for outcome correlation, authorized and unauthorized feedback, adaptation, and budget operations, limits, and audit linkage |

### 0.9 — Release Candidate

| Attribute | Detail |
|---|---|
| **Status** | Planned |
| **Goal** | Validate the complete 0.5 L3 semantics without feature expansion |
| **Entry criteria** | 0.5 L3 specifications and fixtures are complete; no unresolved breaking core, L2, or L3 semantic changes remain |
| **Exit criteria** | Release-candidate fixtures and a public compatibility matrix pass across at least two independently maintained declared implementations using the same named and versioned transport/session topology; each compatibility-matrix row identifies the implementation and version, declared L3 profile and version, topology ID and version, fixture or scenario IDs and versions, and pass result; all required cells pass with no unresolved blocker or critical conformance issue; public governance, release, security-response, and registry processes are published; at least one external L3 autonomy pilot exercises feedback/outcome correlation and the budget, audit, and authorization boundaries; a generic interoperability pilot does not satisfy this gate; no new protocol features are added during the RC period |
| **Scope** | Validation-only RC fixtures and reproducible compatibility matrix, governance/security/registry processes, and external L3 autonomy pilot |

### 1.0

| Attribute | Detail |
|---|---|
| **Status** | Planned |
| **Goal** | Publish stable L3 coordination semantics with a documented boundary declaring L4 and AGI as non-goals |
| **Entry criteria** | Stable feedback/outcome correlation and budget, audit, and authorization boundaries; repeatable conformance results across independently maintained implementations; documented governance, release, licensing, trademark, upgrade, and deprecation policies; published boundary declaring L4 open-ended autonomy and AGI as explicit non-goals |
| **Exit criteria** | 1.0 released |

## Breaking Changes Policy

Before 1.0, breaking changes to the protocol envelope, required event families, delivery semantics, or conformance expectations are permitted. All breaking changes must:

1. Be documented in the release notes for the version that introduces them.
2. Include migration guidance for implementations affected by the change.
3. Update conformance fixtures to reflect the new expectations.
4. Be reflected in all language reference implementations before the release is tagged.

After 1.0, breaking changes follow the deprecation policy defined in `docs/protocol/versioning.md`.

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

Protocol versioning follows `docs/protocol/versioning.md`. The protocol envelope `aep_version` field uses `MAJOR.MINOR` format. Release phase numbers correspond to the protocol version.

## Related Documents

- [Governance](GOVERNANCE.md) (`GOVERNANCE.md`) — project governance and decision-making
- [Roadmap](docs/roadmap.md) — detailed phase descriptions and milestones
- [Versioning](docs/protocol/versioning.md) — protocol versioning rules
- [Trademarks](TRADEMARKS.md) (`TRADEMARKS.md`) — name and mark usage
