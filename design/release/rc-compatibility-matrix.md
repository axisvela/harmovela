# Harmovela 0.9 RC Compatibility Matrix

> Snapshot template for Protocol `v0.5.0`. Status: Preparation in progress; independently maintained implementations and external pilot evidence are **PENDING**.

## Snapshot Metadata

| Field | Value |
| --- | --- |
| Snapshot ID | `[v0.9.0-rc.1-20260817]` |
| Protocol | `v0.5.0` |
| Fixture suite | `34 fixtures; version 1.0.0` |
| L3 profile | `harmovela.adaptation.v1` version `v1` |
| Transport profile(s) | `harmovela.transport.stdio.v1` |
| Topology ID/version | `harmovela.topology.hub-spoke.v1` |
| External L3 pilot | **PENDING** |
| Release-blocker count | `0 open release-blocker issues recorded` |
| Release maintainer | Axisrobo team (designated for `v0.9.0-rc.1`; see `rc-validation.md`) |
| Public tracker | `https://github.com/axisrobo/harmovela/issues` |

## Module Inventory

| Kind | Required modules |
| --- | --- |
| 13 dimension modules | Event, Recovery, Governance, Task, State, Context/Memory, Delegation, Tool, Agent, Environment, Query, Command, Adaptation |
| 5 infrastructure modules | Harness, Conformance, CLI, Runtime, MCP Bridge |

Record module version or revision for every implementation in each populated matrix row.

## Reference Implementations

| Implementation | Version/revision | Repository | Maintainer | Independently maintained |
| --- | --- | --- | --- | --- |
| TypeScript reference | `0.1.0-draft @ 9cba102` | `[in-repository]` | `[required]` | **PENDING** |
| Python reference | `0.1.0.dev0 @ 9cba102` | `[in-repository]` | `[required]` | **PENDING** |
| Go reference | `github.com/axisrobo/harmovela @ 9cba102` | `[in-repository]` | `[required]` | **PENDING** |
| Java reference | `0.1.0-SNAPSHOT @ 9cba102` | `[in-repository]` | `[required]` | **PENDING** |

The four in-repository references are not evidence of independently maintained implementations until their repository and maintainer provenance is recorded and reviewed.

## Profile, Transport, And Wire Snapshot

| Type | Identifier | Version | Wire identifiers/configuration | Status |
| --- | --- | --- | --- | --- |
| Core profile | `harmovela.core.v1` | `v1` | envelope `spec_version: 0.2`, session, subscription, task lifecycle, error model, routing `[required]` | PENDING |
| Security profile | `harmovela.security.v1` | `v1` | identity, authorization scopes, audit, tenant isolation `[required]` | PENDING |
| Coordination profile | `harmovela.coordination.v1` | `v1` | delegation, command, query, freshness/invalidation `[required]` | PENDING |
| L3 adaptation profile | `harmovela.adaptation.v1` | `v1` | feedback/outcome correlation, budget, audit linkage, authorization `[required]` | PENDING |
| Transport profile | `harmovela.transport.stdio.v1` | `v1` | endpoint `stdin/stdout`, newline-delimited JSON `[required]` | PENDING |
| Topology | `harmovela.topology.hub-spoke.v1` | `v1` | central hub with producer/consumer sessions, subscription fanout `[required]` | PENDING |

## Required Results Matrix

One row per implementation x selected L3 profile (`harmovela.adaptation.v1`) x transport profile (`harmovela.transport.stdio.v1`) x topology (`harmovela.topology.hub-spoke.v1`) x official fixture/scenario. All 34 official fixtures (suite version `1.0.0`) run at the harness/session layer; the selected transport and topology pin the deployment axis each row records. `PASS` is supported by the retained snapshot in `conformance/rc-snapshot-20260817.txt` (reproduce with `node tools/conformance-runner.js` from the repository root); a skipped, unrun, or inconclusive cell would block promotion.

| Implementation/version | Profile/version | Transport/version | Topology/version | Fixture/scenario ID | Result | Evidence URI/hash |
| --- | --- | --- | --- | --- | --- |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-unknown-events.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-some-protocol.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-some-payload.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-lifecycle.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/memory-context-ack.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/session-flow.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/event-contract.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/event-core.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/governance-contract.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/tenant-isolation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/tenant-isolation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery-stateful.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery-e2e.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/agent-runtime-semantics.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-blocked-resume.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-timed-out.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-invalid-transitions.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/core-lifecycle.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-output.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-failed.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-cancelled.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-cancel-requested.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delegation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delegation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/adaptation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/adaptation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/command-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/command-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/query-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/query-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/parent-child-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| TypeScript reference 0.1.0-draft@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/parent-child-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-unknown-events.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-some-protocol.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-some-payload.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-lifecycle.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/memory-context-ack.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/session-flow.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/event-contract.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/event-core.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/governance-contract.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/tenant-isolation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/tenant-isolation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery-stateful.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery-e2e.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/agent-runtime-semantics.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-blocked-resume.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-timed-out.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-invalid-transitions.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/core-lifecycle.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-output.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-failed.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-cancelled.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-cancel-requested.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delegation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delegation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/adaptation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/adaptation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/command-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/command-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/query-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/query-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/parent-child-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Python reference 0.1.0.dev0@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/parent-child-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-unknown-events.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-some-protocol.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-some-payload.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-lifecycle.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/memory-context-ack.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/session-flow.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/event-contract.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/event-core.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/governance-contract.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/tenant-isolation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/tenant-isolation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery-stateful.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery-e2e.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/agent-runtime-semantics.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-blocked-resume.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-timed-out.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-invalid-transitions.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/core-lifecycle.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-output.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-failed.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-cancelled.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-cancel-requested.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delegation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delegation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/adaptation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/adaptation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/command-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/command-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/query-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/query-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/parent-child-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Go reference github.com/axisrobo/harmovela@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/parent-child-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-unknown-events.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-some-protocol.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/reject-some-payload.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-lifecycle.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/memory-context-ack.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/session-flow.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/event-contract.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/event-core.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/governance-contract.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/tenant-isolation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/tenant-isolation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery-stateful.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delivery-e2e.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/agent-runtime-semantics.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-blocked-resume.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-timed-out.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-invalid-transitions.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/core-lifecycle.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-output.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-failed.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-cancelled.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/task-cancel-requested.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delegation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/delegation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/adaptation-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/adaptation-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/command-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/command-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/query-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/query-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/parent-child-positive.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |
| Java reference 0.1.0-SNAPSHOT@9cba102 | harmovela.adaptation.v1/v1 | harmovela.transport.stdio.v1/v1 | harmovela.topology.hub-spoke.v1/v1 | fixtures/parent-child-negative.ndjson | PASS | ../../conformance/rc-snapshot-20260817.txt |

## Sign-Off

| Gate | Status | Evidence |
| --- | --- | --- |
| All 34 fixture cells complete and passing (in-repository references) | PASS | `conformance/rc-snapshot-20260817.txt` — 34/34 x 4 references |
| Required matrix rows populated (implementation x profile x transport x topology x fixture) | PASS | 136 rows; every cell `PASS` |
| Two independently maintained implementations | **PENDING** | `[required]` |
| External L3 pilot accepted | **PENDING** | `external-l3-pilot-template.md` report |
| Zero release blockers | PENDING | `0 recorded in public tracker; requires review` |
