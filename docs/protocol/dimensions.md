# Harmovela Dimension Modules

> Status: draft. Maps all 11 coordination dimensions to their event type families, public contracts, and language module locations.

## Dimension Overview

| # | Dimension | Event Families | Concern |
|---|---|---|---|
| 1 | Event | `session.*`, `subscription.*`, `capabilities.*`, `event.*` | Envelope validation, session lifecycle, subscription matching, routing, transport bindings |
| 2 | Recovery | `interruption.*`, `compensation.*` | Resilience: retry, dead-letter, replay, durability, interruption and compensation lifecycle |
| 3 | Governance | _(budget/policy control)_ | Who may do what: identity, authorization, audit, tenant isolation, policy dispatch |
| 4 | Task | `task.*` | Work in flight: lifecycle from submission through completion |
| 5 | State | `state.*`, `freshness.*` | Current known truth: snapshots, deltas, invalidation, temporal freshness windows |
| 6 | Context / Memory | `context.*`, `memory.*`, `belief.*`, `provenance.*` | Cognitive decisions: facts, episodes, invalidation, belief revision, provenance attestation |
| 7 | Delegation | `delegation.*` | Work assignment across agents: ownership, handoff, escalation |
| 8 | Tool | `tool.call.*` | Tool invocation lifecycle (MCP bridge) |
| 9 | Agent | `agent.*` | Agent-to-agent messaging, request/response, decision recording |
| 10 | Environment | `environment.*` | Environment observation, change detection, alerting |
| 11 | Adaptation | `adaptation.*` | Budget enforcement, feedback correlation, outcome tracking |

## Public Contracts

Each dimension module publishes a language-neutral contract boundary. Dimensions depend only on Event contracts.

| Dimension | Contract Documents |
|---|---|
| Event | [event-contract.md](event-contract.md), [session.md](session.md), [subscription.md](subscription.md), [delivery.md](delivery.md), [event-registry-governance.md](event-registry-governance.md) |
| Recovery | [reliability.md](reliability.md), [delivery.md](delivery.md), [task-lifecycle.md](task-lifecycle.md) |
| Governance | [governance-contract.md](governance-contract.md), [security.md](security.md), [l1-policy-surface.md](l1-policy-surface.md) |
| Task | [task-lifecycle.md](task-lifecycle.md) |
| State | [event-dimension-classification.md](event-dimension-classification.md) |
| Context / Memory | [event-dimension-classification.md](event-dimension-classification.md) |
| Delegation | [task-lifecycle.md](task-lifecycle.md) |
| Tool | [event-dimension-classification.md](event-dimension-classification.md) |
| Agent | [event-dimension-classification.md](event-dimension-classification.md) |
| Environment | [event-dimension-classification.md](event-dimension-classification.md) |
| Adaptation | [adaptation-budget.md](adaptation-budget.md), [adaptation-feedback.md](adaptation-feedback.md) |

## Infrastructure Modules

| Module | Concern |
|---|---|
| Harness | Runtime ingress/egress enforcement, dimension wiring, policy dispatch |
| Conformance | Cross-language fixture runner and profile verification |
| CLI | Command-line interface for daemon and client operations |
| Runtime | Runtime service orchestration, configuration, delivery store creation |
| MCP Bridge | MCP-to-Harmovela bridge with async tool handler |

Infrastructure modules are not dimension-specific and provide cross-cutting build, test, transport, and tool-integration support.

## Language Package Locations

| Dimension | TypeScript | Python | Go | Java |
|---|---|---|---|---|
| Event | `packages/event/` | `axisrobo_harmovela_event/` | `event/` | `harmovela/event/` |
| Recovery | `packages/recovery/` | `axisrobo_harmovela_recovery/` | `recovery/` | `harmovela/recovery/` |
| Governance | `packages/governance/` | `axisrobo_harmovela_governance/` | `governance/` | `harmovela/governance/` |
| Task | `packages/task/` | `axisrobo_harmovela_task/` | `task/` | `harmovela/task/` |
| State | `packages/state/` | `axisrobo_harmovela_state/` | `state/` | `harmovela/state/` |
| Context / Memory | `packages/context/` | `axisrobo_harmovela_context/` | `context/` | `harmovela/context/` |
| Delegation | `packages/delegation/` | `axisrobo_harmovela_delegation/` | `delegation/` | `harmovela/delegation/` |
| Tool | `packages/tool/` | `axisrobo_harmovela_tool/` | `tool/` | `harmovela/tool/` |
| Agent | `packages/agent/` | `axisrobo_harmovela_agent/` | `agent/` | `harmovela/agent/` |
| Environment | `packages/environment/` | `axisrobo_harmovela_environment/` | `environment/` | `harmovela/environment/` |
| Adaptation | `packages/adaptation/` | `axisrobo_harmovela_adaptation/` | `adaptation/` | `harmovela/adaptation/` |

## Dependencies

All dimension modules depend only on Event public contracts. No dimension module imports from another dimension's internals. Infrastructure modules depend on dimension public APIs.

## Related Documents

- [event-dimension-classification.md](event-dimension-classification.md) — event type family ownership per dimension
- [compatibility-matrix.md](compatibility-matrix.md) — per-dimension migration evidence across all 4 languages
- [architecture.md](../architecture.md) — system-level architecture and module layout
