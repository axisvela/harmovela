# Harmovela v0.9.0-rc.1 Release Notes

> Status: Release candidate preparation. Protocol version `v0.5.0`; RC validation in progress; external evidence pending.

## RC Scope

v0.9.0-rc.1 validates the complete 0.5 Adaptation Preview L3 semantics **without feature expansion**. The RC period freezes protocol, profile, schema, fixture, and wire-identifier behavior; only release-blocker fixes, non-normative test corrections, documentation corrections, and reproducibility improvements are accepted (see `docs/release/rc-validation.md`).

## Compatibility Snapshot

| Axis | Identifier | Version |
| --- | --- | --- |
| Protocol | Harmovela Protocol | `v0.5.0` |
| Fixture/scenario suite | `conformance/manifest.json` | `1.0.0` (34 fixtures) |
| Core profile | `harmovela.core.v1` | `v1` |
| Security profile | `harmovela.security.v1` | `v1` |
| Coordination profile | `harmovela.coordination.v1` | `v1` |
| L3 adaptation profile | `harmovela.adaptation.v1` | `v1` |
| Transport profile | `harmovela.transport.stdio.v1` | `v1` |
| Topology | `harmovela.topology.hub-spoke.v1` | `v1` |

Full matrix rows in `docs/release/rc-compatibility-matrix.md` (revision `9cba102`).

## Evidence Status

| Gate | Status |
| --- | --- |
| 34-fixture cross-language matrix (in-repository references) | PASS — 34/34 x TypeScript, Python, Go, Java |
| Required matrix rows populated | PASS — 136 cells |
| Security-response process published | PASS — `SECURITY.md` |
| Governance, release, registry processes published | PASS — `GOVERNANCE.md`, `RELEASES.md`, `event-registry-governance.md` |
| Two independently maintained implementations | PENDING — external evidence; see [independent-implementation-guide.md](independent-implementation-guide.md) |
| External L3 pilot | PENDING — external evidence |
| Zero `release-blocker` issues | PENDING — 0 recorded in public tracker; review required |

Designated release maintainer: **Axisrobo team** (recorded in `docs/release/rc-validation.md`). Public tracker: `https://github.com/axisrobo/harmovela/issues`.

Retained logs in `conformance/rc-logs-20260817/` and `conformance/rc-snapshot-20260817.txt`.

## Known Limitations

- **TypeScript test execution**: run `node --test --test-concurrency=1` (or `npm test`) to avoid port/resource contention between server tests in parallel test-runner mode. The full suite passes (298 tests) in this configuration.
- **Python `test_conformance_runs`**: previously failed when the Python suite was invoked from the repository root because the CLI resolved `tests/test_fixtures.py` relative to the current working directory. Fixed by resolving the fixture path from the CLI package; the full Python suite now passes (253 tests).

## Changes In This RC Preparation

- Corrected 0.4 Beta release status from `Current` to `Delivered` in `RELEASES.md`.
- Declared official fixture/scenario suite version `1.0.0` in `conformance/manifest.json` and RC docs.
- Declared selected transport profile `harmovela.transport.stdio.v1` and topology `harmovela.topology.hub-spoke.v1`.
- Added `Topology Identifiers` section to `docs/protocol/profiles.md`.
- Published `SECURITY.md` security-response process and rendered it at `docs/site/security-response.html`.
- Populated the 0.9 RC compatibility matrix (136 cells) and retained the conformance snapshot.
- Fixed the spec-site generator to normalize CRLF and to render `SECURITY.md`/`CONFORMANCE.md` under collision-free lowercase names.
- Fixed the TypeScript WebSocket endpoint default and runtime fallback to `/harmovela` (resolves the WS test-suite hang).
- Fixed the Python conformance CLI to resolve the fixture test file by package path instead of the current working directory.
- Upgraded `better-sqlite3` from `^11.0.0` to `^13.0.3` in the TypeScript implementation for Node 24 native-binding support.
