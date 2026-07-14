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
8. Adaptation after its 0.5 semantics stabilize

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

All seven dimensions have been extracted from the legacy `aep` namespace into independent Harmovela dimension modules across all four languages. Evidence recorded in `docs/protocol/compatibility-matrix.md` Dimension Migration Evidence section.

### Completed Dimensions

| # | Dimension | TypeScript | Python | Go | Java | Adapter wired | Tests present |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Event | `@axisrobo/harmovela-event` | `axisrobo_harmovela_event` | `github.com/axisrobo/harmovela/event` | `com.axisrobo.harmovela.event.*` | Yes (harness + transport) | Yes (28 test modules) |
| 2 | Recovery | `@axisrobo/harmovela-recovery` | `axisrobo_harmovela_recovery` | `github.com/axisrobo/harmovela/recovery` | `com.axisrobo.harmovela.recovery.*` | Yes (harness + config + barrel) | Yes (5 test modules per language) |
| 3 | Governance | `@axisrobo/harmovela-governance` | `axisrobo_harmovela_governance` | `github.com/axisrobo/harmovela/governance` | `com.axisrobo.harmovela.governance.GovernancePolicy` | Yes (harness) | Yes (1 test module per language) |
| 4 | Task | `@axisrobo/harmovela-task` | `axisrobo_harmovela_task` | `github.com/axisrobo/harmovela/task` | `com.axisrobo.harmovela.task.TaskTracker` | Yes (harness + barrel) | Yes (1 test module per language) |
| 5 | State | `@axisrobo/harmovela-state` | `axisrobo_harmovela_state` | `github.com/axisrobo/harmovela/state` | `com.axisrobo.harmovela.state.StateTypes` | No (module exists; types still hardcoded in legacy adapter) | Yes (1 test module per language) |
| 6 | Context/Memory | `@axisrobo/harmovela-context` | `axisrobo_harmovela_context` | `github.com/axisrobo/harmovela/context` | `com.axisrobo.harmovela.context.ContextMemoryTypes` | Yes (legacy-dimension-types union) | Yes (1 test module per language) |
| 7 | Delegation | `@axisrobo/harmovela-delegation` | `axisrobo_harmovela_delegation` | `github.com/axisrobo/harmovela/delegation` | `com.axisrobo.harmovela.delegation.DelegationTypes` | Yes (legacy-dimension-types union) | Yes (1 test module per language) |

### Architecture Compliance

- **Zero reverse dependencies:** All 28 dimension modules (7 x 4) verified — no dimension module imports from any `aep` package/namespace.
- **One-way adapter direction:** Legacy `aep` harnesses, barrels, runtime, and CLI import from dimension public APIs only.
- **Wire identifiers preserved:** Event transport modules retain legacy `aep` wire defaults (endpoint paths, subprotocols, NATS/Kafka/Redis prefixes, headers, proto filename) pending explicit compatibility decisions documented in the compatibility matrix.

### Remaining Work

| Item | Scope | Status |
| --- | --- | --- |
| State dimension adapter wiring | 4 languages | Module exists; inline types in legacy adapter need replacement with import |
| Undimensioned legacy type extraction or retirement | ~45 types across 7 families (tool.call, agent, environment, belief, freshness, interruption, compensation, provenance) | Not yet assigned to dimension modules |
| Wire identifier compatibility decisions | Endpoints, subprotocols, transport prefixes, schema IDs, proto filenames | Pending explicit Protocol/Profile decisions |
| Package/CLI/config rename | 4 languages | `@axisrobo/aep` top-level identity retained |
| Shared contract decisions | Envelope schemas, error helpers, gRPC proto | Pending explicit Protocol decisions |

## 1.0 Gate

- Every required dimension module is independently publishable and has documented public contracts.
- No public `aep` package/import, CLI/daemon, configuration key, environment variable, endpoint, schema/IDL identifier, or wire adapter remains.
- The compatibility matrix records migration evidence for every legacy surface and no unresolved removal blocker remains.
- All required profiles and shared fixtures pass across independently maintained implementations.

## Non-Goals

- This design does not treat a language package version or dimension milestone as a Protocol 1.0 release.
- This design does not add Adaptation semantics before the 0.5 specification gate.
