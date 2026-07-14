# Harmovela 0.9 RC Compatibility Matrix

> Snapshot template for Protocol `v0.5.0`. Status: Preparation in progress; independently maintained implementations and external pilot evidence are **PENDING**.

## Snapshot Metadata

| Field | Value |
| --- | --- |
| Snapshot ID | `[v0.9.0-rc.1-YYYYMMDD]` |
| Protocol | `v0.5.0` |
| Fixture suite | `32 fixtures; version [required]` |
| L3 profile | `harmovela.adaptation.v1` version `[required]` |
| Transport profile(s) | `[ID and version required]` |
| Topology ID/version | `[required; distinct from transport profile]` |
| External L3 pilot | **PENDING** |
| Release-blocker count | `[required]` |

## Module Inventory

| Kind | Required modules |
| --- | --- |
| 13 dimension modules | Event, Recovery, Governance, Task, State, Context/Memory, Delegation, Tool, Agent, Environment, Query, Command, Adaptation |
| 5 infrastructure modules | Harness, Conformance, CLI, Runtime, MCP Bridge |

Record module version or revision for every implementation in each populated matrix row.

## Reference Implementations

| Implementation | Version/revision | Repository | Maintainer | Independently maintained |
| --- | --- | --- | --- | --- |
| TypeScript reference | `[required]` | `[required]` | `[required]` | **PENDING** |
| Python reference | `[required]` | `[required]` | `[required]` | **PENDING** |
| Go reference | `[required]` | `[required]` | `[required]` | **PENDING** |
| Java reference | `[required]` | `[required]` | `[required]` | **PENDING** |

The four in-repository references are not evidence of independently maintained implementations until their repository and maintainer provenance is recorded and reviewed.

## Profile, Transport, And Wire Snapshot

| Type | Identifier | Version | Wire identifiers/configuration | Status |
| --- | --- | --- | --- | --- |
| Core profile | `harmovela.core.v1` | `[required]` | `[required]` | PENDING |
| Security profile | `harmovela.security.v1` | `[required]` | `[required]` | PENDING |
| Coordination profile | `harmovela.coordination.v1` | `[required]` | `[required]` | PENDING |
| L3 adaptation profile | `harmovela.adaptation.v1` | `[required]` | `[required]` | PENDING |
| Transport profile | `[required]` | `[required]` | endpoint, subprotocol/content type, routing identifiers `[required]` | PENDING |
| Topology | `[required]` | `[required]` | participant roles and connectivity `[required]` | PENDING |

## Required Results Matrix

Populate one row for every implementation x selected L3 profile x transport profile x topology x official fixture/scenario. `PASS` requires retained evidence; `NOT RUN`, `SKIP`, and `FAIL` block promotion.

| Implementation/version | Profile/version | Transport/version | Topology/version | Fixture/scenario ID | Result | Evidence URI/hash |
| --- | --- | --- | --- | --- | --- |
| `[required]` | `[required]` | `[required]` | `[required]` | `[one of 32 fixture IDs or official scenario ID]` | PENDING | `[required]` |

## Sign-Off

| Gate | Status | Evidence |
| --- | --- | --- |
| All 32 fixture cells complete and passing | PENDING | `[required]` |
| Two independently maintained implementations | **PENDING** | `[required]` |
| External L3 pilot accepted | **PENDING** | `external-l3-pilot-template.md` report |
| Zero release blockers | PENDING | `[required]` |
