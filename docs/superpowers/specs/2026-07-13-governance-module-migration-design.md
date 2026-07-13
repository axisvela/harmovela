# Governance Module Migration Design

## Goal

Move new Governance policy code out of legacy `aep` namespaces into independent Harmovela Governance modules in all four languages. Legacy `aep` code may consume the public Governance contract only as a compatibility adapter.

## Layout

| Language | Governance module | Legacy adapter boundary |
| --- | --- | --- |
| TypeScript | `implementations/typescript/packages/governance/` (`@axisrobo/harmovela-governance`) | Existing runtime/harness imports public exports only |
| Python | `implementations/python/src/axisrobo_harmovela_governance/` | `aep` imports package API only |
| Go | `implementations/go/governance/` | `aep` imports `github.com/axisrobo/harmovela/governance` |
| Java | `com.axisrobo.harmovela.governance` | `com.axisrobo.aep` imports public classes only |

## Rule

New domain implementation belongs to its dimension module: Event, Task, State, Context/Memory, Delegation, Recovery, or Governance. No new domain implementation may be added under `aep`. Existing `aep` code is a legacy adapter boundary and must not be a dependency of a dimension module.

## Migration

The policy and tests introduced by `ca3ac0f` move in a new commit; history is not rewritten. Public behavior and policy test cases remain unchanged. Harness integration happens only after imports point from `aep` to Governance, never the reverse.

## Verification

- Each policy test runs from its Governance module.
- No Governance module imports an `aep` implementation package.
- Existing language suites pass after moved imports are updated.
- `AGENTS.md` and `CLAUDE.md` contain identical module-boundary rules.
