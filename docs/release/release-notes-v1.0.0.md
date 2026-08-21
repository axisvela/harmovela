# Harmovela v1.0.0 Release Notes

> Status: Delivered. Protocol version `v1.0.0`; released as a wire-compatible declaration.

## Release Declaration

Harmovela Protocol 1.0 declares the L3 adaptation coordination semantics stable with a documented boundary declaring L4 open-ended autonomy and AGI as explicit non-goals. This release is **wire-compatible**: the envelope `spec_version` remains `0.2`; profiles, schemas, fixtures, and wire identifiers are unchanged from the 0.5/0.9 freeze.

## Explicit Compatibility Decision

This release records an explicit compatibility decision by the release maintainer (Axisrobo team): the 0.9 RC exit gates requiring **external evidence** were not satisfied when 1.0 was declared, and they are **exempted from 1.0 and deferred to 1.1**. The deferred gates are:

1. Two implementations maintained in distinct public repositories by distinct maintainers.
2. An external L3 autonomy pilot whose operator is not a maintainer of either participating implementation.
3. Zero `release-blocker` issues reviewed independently in the public tracker.

This decision does not change protocol, profile, schema, fixture, or wire-identifier behavior. The in-repository validation evidence that was completed for the 0.9 RC remains valid as the 1.0 conformance baseline: a 34-fixture cross-language matrix across TypeScript, Python, Go, and Java (136 cells, all PASS; snapshot `conformance/rc-snapshot-20260817.txt`), with retained logs in `conformance/rc-logs-20260817/`.

## Compatibility Snapshot

| Axis | Identifier | Version |
| --- | --- | --- |
| Protocol | Harmovela Protocol | `v1.0.0` |
| Envelope `spec_version` | — | `0.2` (unchanged, wire-compatible) |
| Fixture/scenario suite | `conformance/manifest.json` | `1.0.0` (34 fixtures) |
| Core profile | `harmovela.core.v1` | `v1` |
| Security profile | `harmovela.security.v1` | `v1` |
| Coordination profile | `harmovela.coordination.v1` | `v1` |
| L3 adaptation profile | `harmovela.adaptation.v1` | `v1` |
| Transport profile | `harmovela.transport.stdio.v1` | `v1` |
| Topology | `harmovela.topology.hub-spoke.v1` | `v1` |

## 1.0 Exit Criteria Status

| Criterion | Status |
| --- | --- |
| Stable feedback/outcome correlation and budget, audit, and authorization boundaries | PASS — L3 profile `harmovela.adaptation.v1` with positive/negative fixtures |
| Documented governance, release, licensing, trademark, upgrade, and deprecation policies | PASS — `GOVERNANCE.md`, `RELEASES.md`, `TRADEMARKS.md`, `docs/protocol/versioning.md` |
| Published boundary declaring L4 and AGI as non-goals | PASS — `docs/roadmap.md`, `docs/roadmap/adaptation-layer.md` |
| Two independently maintained implementations | DEFERRED to 1.1 (explicit decision) |
| External L3 autonomy pilot | DEFERRED to 1.1 (explicit decision) |
| Zero `release-blocker` issues, independently reviewed | DEFERRED to 1.1 (explicit decision) |

## 1.1 Carry-Forward

The deferred external-evidence gates are recorded as the 1.1 exit criteria in `RELEASES.md` and `docs/roadmap/adaptation-layer.md`. 1.1 does not introduce new protocol features.

## Known Limitations

- **TypeScript test execution**: run `node --test --test-concurrency=1` (or `npm test`) to avoid port/resource contention between server tests in parallel test-runner mode. The full suite passes (298 tests) in this configuration.
- **Python conformance CLI**: fixture test files are resolved by package path, not the current working directory; the full Python suite passes (253 tests).
