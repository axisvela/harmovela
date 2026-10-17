# Dimension-First AEP Removal Design

## Goal

Migrate all legacy `aep` implementation code into independent Harmovela dimension modules across TypeScript, Python, Go, and Java. Remove the public `aep` package, CLI, daemon, configuration, endpoint, and wire adapter surfaces in Harmovela Protocol 1.0.

## Version Decision

- **Protocol:** Harmovela Protocol 1.0 removes public `aep` compatibility surfaces.
- **Milestone:** completion of one dimension migration is implementation progress, not a Protocol release.
- **Profile:** dimension profiles remain independently versioned and negotiated.
- **Implementation:** language packages may migrate independently but must satisfy the shared dimension fixture before the milestone advances.

## Migration Order

1. Event
2. Recovery
3. Governance
4. Task
5. State
6. Context / Memory
7. Delegation
8. Tool
9. Agent
10. Environment
11. Adaptation after its 0.5 semantics stabilize

## Boundaries

- Event is the base module.
- Recovery depends on Event.
- Governance depends on Event.
- Task, State, Context/Memory, and Delegation depend on Event and may consume Governance public contracts.
- Adaptation depends on stable Coordination and Governance contracts.
- A dimension module must never import legacy `aep` code.
- During 0.x migration, legacy `aep` may adapt to a dimension public API only. It may not contain new domain implementation or become a dependency of a dimension module.

## Per-Dimension Gate

1. Inventory and classify every legacy file/API by dimension in the compatibility matrix.
2. Move, do not copy, implementation into all four language dimension modules.
3. Add shared positive and negative fixtures that prove the dimension contract.
4. Run all four language suites and the cross-language conformance runner.
5. Update the compatibility matrix with migration state, adapter behavior, removal gate, and fixture evidence.

## Migration Status (2026-07-14)

All ten dimensions have been extracted from the legacy `aep` namespace into independent Harmovela dimension modules across all four languages. Evidence recorded in `design/protocol/compatibility-matrix.md` Dimension Migration Evidence section. No undimensioned legacy event types remain.

### Completed Dimensions

| # | Dimension | TypeScript | Python | Go | Java | Adapter wired | Tests present |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Event | `@axisvela/harmovela-event` | `axisrobo_harmovela_event` | `github.com/axisvela/harmovela/event` | `com.axisrobo.harmovela.event.*` | Yes (harness + transport) | Yes (28 test modules) |
| 2 | Recovery | `@axisvela/harmovela-recovery` | `axisrobo_harmovela_recovery` | `github.com/axisvela/harmovela/recovery` | `com.axisrobo.harmovela.recovery.*` | Yes (harness + config + barrel) | Yes (5 test modules per language) |
| 3 | Governance | `@axisvela/harmovela-governance` | `axisrobo_harmovela_governance` | `github.com/axisvela/harmovela/governance` | `com.axisrobo.harmovela.governance.GovernancePolicy` | Yes (harness) | Yes (1 test module per language) |
| 4 | Task | `@axisvela/harmovela-task` | `axisrobo_harmovela_task` | `github.com/axisvela/harmovela/task` | `com.axisrobo.harmovela.task.TaskTracker` | Yes (harness + barrel) | Yes (1 test module per language) |
| 5 | State | `@axisvela/harmovela-state` | `axisrobo_harmovela_state` | `github.com/axisvela/harmovela/state` | `com.axisrobo.harmovela.state.StateTypes` | Yes (legacy-dimension-types union) | Yes (1 test module per language) |
| 6 | Context/Memory | `@axisvela/harmovela-context` | `axisrobo_harmovela_context` | `github.com/axisvela/harmovela/context` | `com.axisrobo.harmovela.context.ContextMemoryTypes` | Yes (legacy-dimension-types union) | Yes (1 test module per language) |
| 7 | Delegation | `@axisvela/harmovela-delegation` | `axisrobo_harmovela_delegation` | `github.com/axisvela/harmovela/delegation` | `com.axisrobo.harmovela.delegation.DelegationTypes` | Yes (legacy-dimension-types union) | Yes (1 test module per language) |
| 8 | Tool | `@axisvela/harmovela-tool` | `axisrobo_harmovela_tool` | `github.com/axisvela/harmovela/tool` | `com.axisrobo.harmovela.tool.ToolTypes` | Yes (legacy-dimension-types union) | Yes (1 test module per language) |
| 9 | Agent | `@axisvela/harmovela-agent` | `axisrobo_harmovela_agent` | `github.com/axisvela/harmovela/agent` | `com.axisrobo.harmovela.agent.AgentTypes` | Yes (legacy-dimension-types union) | Yes (1 test module per language) |
| 10 | Environment | `@axisvela/harmovela-environment` | `axisrobo_harmovela_environment` | `github.com/axisvela/harmovela/environment` | `com.axisrobo.harmovela.environment.EnvironmentTypes` | Yes (legacy-dimension-types union) | Yes (1 test module per language) |

### Architecture Compliance

- **Zero reverse dependencies:** All 40 dimension modules (10 x 4) verified — no dimension module imports from any `aep` package/namespace.
- **One-way adapter direction:** Legacy `aep` harnesses, barrels, runtime, and CLI import from dimension public APIs only.
- **Wire identifiers preserved:** Event transport modules retain legacy `aep` wire defaults (endpoint paths, subprotocols, NATS/Kafka/Redis prefixes, headers, proto filename) pending explicit compatibility decisions documented in the compatibility matrix.

### Remaining Work

| Item | Scope | Status |
| --- | --- | --- |
| Dimension migration (10 dimensions, 4 languages) | Event, Recovery, Governance, Task, State, Context/Memory, Delegation, Tool, Agent, Environment | **COMPLETE** — All 40 modules exist with adapter wiring and tests |
| Wire identifier compatibility decisions | Endpoints, subprotocols, transport prefixes, schema IDs, proto filenames | Pending explicit Protocol/Profile decisions |
| Package/CLI/config rename | 4 languages | `@axisvela/aep` top-level identity retained |
| Shared contract decisions | Envelope schemas, error helpers, gRPC proto | Pending explicit Protocol decisions |

## 1.0 Gate

- Every required dimension module is independently publishable and has documented public contracts.
- No public `aep` package/import, CLI/daemon, configuration key, environment variable, endpoint, schema/IDL identifier, or wire adapter remains.
- The compatibility matrix records migration evidence for every legacy surface and no unresolved removal blocker remains.
- All required profiles and shared fixtures pass across independently maintained implementations.

## Non-Goals

- This design does not treat a language package version or dimension milestone as a Protocol 1.0 release.
- This design does not add Adaptation semantics before the 0.5 specification gate.
