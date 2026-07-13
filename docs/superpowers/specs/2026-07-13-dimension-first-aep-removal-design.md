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

## 1.0 Gate

- Every required dimension module is independently publishable and has documented public contracts.
- No public `aep` package/import, CLI/daemon, configuration key, environment variable, endpoint, schema/IDL identifier, or wire adapter remains.
- The compatibility matrix records migration evidence for every legacy surface and no unresolved removal blocker remains.
- All required profiles and shared fixtures pass across independently maintained implementations.

## Non-Goals

- This design does not treat a language package version or dimension milestone as a Protocol 1.0 release.
- This design does not add Adaptation semantics before the 0.5 specification gate.
