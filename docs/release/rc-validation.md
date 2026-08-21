# Harmovela 0.9 RC Validation

> Status: Preparation in progress; external evidence pending. This kit defines required evidence; it does not claim that an external pilot or independently maintained implementation has occurred.

## RC Freeze Rules

1. `v0.9.0-rc.1` begins a no-new-feature freeze for protocol, profile, schema, fixture, and wire-identifier behavior.
2. Only release-blocker fixes, test corrections that do not change normative behavior, documentation corrections, and reproducibility improvements may be accepted during the RC period.
3. Any proposed exception requires written approval from the designated release maintainer, updated compatibility evidence, and a new RC tag.
4. Every accepted RC change must rerun the full required test matrix and update the compatibility snapshot.
5. The RC may not be promoted while a release-blocker remains open.

## Designated Release Maintainer

The designated release maintainer for `v0.9.0-rc.1` is the **Axisrobo team**, acting through the Axisrobo maintainers who hold decision authority during the 0.x phase (see [GOVERNANCE.md](../GOVERNANCE.md)). The release maintainer tags `release-blocker` issues in the public tracker, approves RC exceptions, and owns promotion. This designation is recorded in the current release documents; it does not alter the historical 0.4/0.5 release records.

## Public Tracker

The public tracker for release-blocker tagging is the GitHub issue tracker of the canonical repository `https://github.com/axisrobo/harmovela`. A `release-blocker` is an open issue tagged `release-blocker` by the designated release maintainer.

## Required Test Commands

Run from the repository root unless a command states otherwise:

```sh
node tools/conformance-runner.js
npm test
python -m pytest implementations/python/tests
(cd implementations/go && go test ./...)
mvn test -f implementations/java/pom.xml
```

Record the command, revision, environment, exit code, and retained output location in the compatibility snapshot. If a command is unavailable in the validation environment, the result is `NOT RUN`, not `PASS`.

## Required Fixture And Profile Matrix

The RC matrix must run all 34 official fixtures (suite version `1.0.0`, declared in `conformance/manifest.json`) in `conformance/fixtures/` against each selected implementation, profile, transport profile, and topology combination. The selected L3 profile must include its declared dependencies:

| Profile | Version | Required result |
| --- | --- | --- |
| `harmovela.core.v1` | `[version]` | PASS |
| `harmovela.security.v1` | `[version]` | PASS |
| `harmovela.coordination.v1` | `[version]` | PASS |
| `harmovela.adaptation.v1` | `[version]` | PASS |

The selected transport profile is `harmovela.transport.stdio.v1` and the selected topology identifier is `harmovela.topology.hub-spoke.v1` (declared in [profiles.md](profiles.md#topology-identifiers)); each matrix row must record both with their versions.

The matrix must include positive and negative evidence for feedback/outcome correlation, budget establishment/change/enforcement/violation, audit linkage, authorization, and tenant isolation. Every required cell is implementation x profile x transport profile x topology x fixture/scenario. A skipped, unrun, or inconclusive required cell is not a passing matrix.

## Compatibility Snapshot Fields

Each versioned snapshot must record:

- Snapshot ID, date, validator, repository revision, and artifact hashes.
- Protocol version, profile IDs and versions, fixture-suite version, and scenario IDs.
- Implementation name, version, repository URL, maintainer identity, and independent-maintenance status.
- Transport profile ID/version, topology ID/version, endpoint or routing configuration, and wire identifiers.
- Host OS, runtime/toolchain versions, command lines, environment constraints, and retained logs.
- Per-fixture and per-scenario result, evidence URI or hash, observed failures, and reproduction instructions.
- Release-blocker issue IDs and status.

## External L3 Pilot Acceptance

An external L3 pilot is accepted only when its completed report:

1. Names an operator who is not a maintainer of either participating implementation.
2. Identifies both implementation names, versions, repositories, maintainers, the L3 profile/version, transport profile/version, topology ID/version, and fixture/scenario-suite version.
3. Provides per-fixture and per-scenario pass/fail evidence for feedback/outcome, budget, audit, authorization, and tenant-isolation boundaries.
4. Shows every required result passing and supplies reproducible commands and retained evidence.

A generic interoperability demonstration does not meet this acceptance criterion.

## Independent Implementation Evidence

Use the following template for each implementation claimed as independently maintained. For field-by-field guidance and examples of what does and does not count as independent maintenance, see [`independent-implementation-guide.md`](independent-implementation-guide.md).

```text
Implementation name and version:
Repository URL and immutable revision:
Maintainer name/contact:
Maintainer relationship to other implementation(s):
Independent repository and maintenance evidence:
Selected profile IDs and versions:
Transport profile and version:
Topology identifier and version:
Fixture/scenario suite version:
Per-fixture/scenario evidence location:
Reproduction commands and environment:
Validator and validation date:
Open failures or release blockers:
```

Independent status is `PENDING` until this template is completed and reviewed. Shared ownership, shared release control, or unverified provenance is not independent-maintenance evidence.

## Release-Blocker Definition

A `release-blocker` is an open issue tagged `release-blocker` by the designated release maintainer in the public tracker that prevents a required RC gate from being met. This includes a failing or unrun required matrix cell, unresolved semantic or wire incompatibility, security-boundary failure, missing required governance/security/registry process, missing accepted external pilot, or missing independent implementation evidence. Promotion requires zero open `release-blocker` issues.
