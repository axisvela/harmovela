# Harmovela Protocol Releases

> Current version: **0.2 draft** (post-migration core stabilization)

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
| **Status** | In progress |
| **Goal** | Establish the Harmovela protocol identity and freeze the minimum interoperable coordination core |
| **Entry criteria** | 0.1 draft complete with passing cross-language conformance |
| **Exit criteria** | Protocol identity consistently documented; legacy technical identifiers have explicit compatibility policy; envelope, session, subscription, task lifecycle, errors, correlation, version negotiation, and delivery semantics frozen; internally consistent conformance levels |
| **Scope** | Public identity transition from AEP to Harmovela; naming and namespace rules; governance, release, trademark, and licensing documentation; core semantics freeze |

### 0.3 — Profiles

| Attribute | Detail |
|---|---|
| **Status** | Planned |
| **Goal** | Separate the stable core from independently adoptable coordination capabilities |
| **Entry criteria** | 0.2 core stabilization complete |
| **Exit criteria** | Profile model defined with identifier, dependencies, capability negotiation, versioning, and conformance fixture requirements; at least one optional profile fully specified with fixtures |
| **Scope** | Runtime semantics profile, durable delivery profile, security profile, transport-specific capability profiles |

### 0.5 — Beta

| Attribute | Detail |
|---|---|
| **Status** | Planned |
| **Goal** | Prove stable interoperability beyond the founding implementation set |
| **Entry criteria** | Frozen beta core with published compatibility policy; passing cross-language conformance results; at least two independently maintained interoperable implementations; at least three documented integration scenarios covering asynchronous task work, state/context updates, and delegated coordination |
| **Exit criteria** | Beta core stable for at least one release cycle; no unremediated conformance regressions; public governance model proposed |
| **Scope** | Community governance proposal; external implementation support; integration scenario expansion |

### 0.9 — Release Candidate

| Attribute | Detail |
|---|---|
| **Status** | Planned |
| **Goal** | Validate the proposed 1.0 core without new feature expansion |
| **Entry criteria** | No unresolved breaking core semantic changes; release-candidate conformance fixtures and compatibility matrix; public governance, release, security-response, and registry processes; at least one external deployment or interoperability pilot |
| **Exit criteria** | No new blocking issues during RC period; conformance stable across all implementations |
| **Scope** | Final polishing; documentation completeness; governance operational |

### 1.0

| Attribute | Detail |
|---|---|
| **Status** | Planned |
| **Goal** | Publish a stable, implementable open coordination protocol for autonomous systems |
| **Entry criteria** | Stable core semantics and version negotiation; repeatable conformance results across independently maintained implementations; documented governance, release, licensing, and trademark policies; clear separation between required core behavior and optional profiles; published upgrade and deprecation policy |
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
