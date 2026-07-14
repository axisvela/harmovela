# Event Type Dimension Classification

Classification of legacy undimensioned event types into Harmovela coordination dimensions.

## Classification Summary

| Event Type Family | Dimension | Status |
|---|---|---|
| `state.*`, `freshness.*` | State | In `State` module; spread into legacy registries |
| `belief.*`, `provenance.*` | Context / Memory | In `Context` module (cognitive facts and attestations); spread into legacy registries |
| `context.*`, `memory.*` | Context / Memory | Already in `Context` module |
| `delegation.*` | Delegation | Already in `Delegation` module |
| `interruption.*`, `compensation.*` | Recovery | In `Recovery` module; spread into legacy registries |
| `task.*` | Task | Already in `Task` module; may benefit from future spreading |
| `tool.call.*`, `agent.*`, `environment.*` | — | Domain-level (no dimension module needed) |

## Rationale

**State dimension** (`state.*`, `freshness.*`): Covers current known truth, snapshots, deltas, invalidation, and temporal freshness windows. The `State` module owns these.

**Context / Memory dimension** (`belief.*`, `provenance.*`): Covers cognitive decisions (belief revision, conflict detection) and provenance attestation chains. The `Context` module owns these alongside existing `context.*` and `memory.*` types.

**Recovery dimension** (`interruption.*`, `compensation.*`): Interruption lifecycle and compensation semantics belong to the Resilience/Recovery dimension. The `Recovery` module owns these and they are spread into legacy registries.

**Domain-level** (`tool.call.*`, `agent.*`, `environment.*`): These describe domain-specific application behavior (tool execution, agent messaging, environment observation). They are not protocol coordination concerns and do not require a dedicated dimension module at this time.
