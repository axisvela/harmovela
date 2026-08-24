# Harmovela Dimension Modules Design

**Status:** Proposed architecture for the next breaking release.

## Goal

Replace the monolithic legacy `aep` implementation boundary with independently publishable, low-coupling Harmovela modules organized by coordination dimension. Harmovela is the public protocol identity; Axisrobo remains the implementation organization and package namespace.

## Decision

Use **dimension-first** physical modules. The maturity layers Event -> Coordination -> Adaptation remain dependency and release-planning labels, not a second competing directory hierarchy.

Every new public API must live in a Harmovela-named Axisrobo package. The legacy `aep` public surface is removed in the breaking release; no public compatibility facade is retained.

## Module Model

| Dimension | Responsibility | Maturity layer | Allowed dependencies |
| --- | --- | --- | --- |
| Event | Envelope, event registry, session, subscriptions, routing, transport contracts | Event | None |
| Recovery | Delivery state, acknowledgement, retry, replay, dead letter, durability | Event | Event |
| Task | Task identity and lifecycle | Coordination | Event, Governance contracts |
| State | Snapshots, deltas, freshness, invalidation, convergence rules | Coordination | Event, Governance contracts |
| Context / Memory | Context and memory updates, retrieval readiness, provenance references | Coordination | Event, State contracts, Governance contracts |
| Delegation | Ownership, assignment, acceptance, handoff, escalation, cancellation propagation | Coordination | Event, Task contracts, Governance contracts |
| Governance | Identity, authorization, audit, tenant isolation, policy and budget contracts | Cross-cutting | Event |
| Adaptation | Feedback/outcome correlation and policy-bounded adaptation | Adaptation | Event, Task, State, Context/Memory, Delegation, Governance contracts |

Adaptation is not published as an implementation package until its 0.5 semantics are stabilized. Until then, it is a roadmap/profile boundary only. Its prospective dependency row prevents the package design from being improvised later.

Modules communicate through public contracts and Harmovela event envelopes. No module may import another module's internal implementation. Governance contracts are consumed by modules and enforced by runtime ingress/egress composition; Governance is not an Adaptation-only utility.

## Public Package Names

| Dimension | TypeScript | Python | Go | Java |
| --- | --- | --- | --- | --- |
| Event | `@axisrobo/harmovela-event` | `axisrobo_harmovela_event` | `event` | `com.axisrobo.harmovela.event` |
| Task | `@axisrobo/harmovela-task` | `axisrobo_harmovela_task` | `task` | `com.axisrobo.harmovela.task` |
| State | `@axisrobo/harmovela-state` | `axisrobo_harmovela_state` | `state` | `com.axisrobo.harmovela.state` |
| Context / Memory | `@axisrobo/harmovela-context` | `axisrobo_harmovela_context` | `context` | `com.axisrobo.harmovela.context` |
| Delegation | `@axisrobo/harmovela-delegation` | `axisrobo_harmovela_delegation` | `delegation` | `com.axisrobo.harmovela.delegation` |
| Recovery | `@axisrobo/harmovela-recovery` | `axisrobo_harmovela_recovery` | `recovery` | `com.axisrobo.harmovela.recovery` |
| Governance | `@axisrobo/harmovela-governance` | `axisrobo_harmovela_governance` | `governance` | `com.axisrobo.harmovela.governance` |
| Adaptation (future) | `@axisrobo/harmovela-adaptation` | `axisrobo_harmovela_adaptation` | `adaptation` | `com.axisrobo.harmovela.adaptation` |

The Go module remains `github.com/axisrobo/harmovela`; dimensions are Go subpackages. Each other language publishes a package/artifact per dimension. A language may initially ship a dimension package as a thin public module over a shared internal implementation, but its public dependency graph must already match this specification.

## Breaking Release Compatibility Policy

This design requires an explicit major-version compatibility decision before implementation:

- Replace public `aep` package/import names, CLI commands, daemon names, configuration names, environment variables, endpoint paths, and transport subprotocol identifiers with Harmovela names.
- Do not retain public `aep` re-export packages or command aliases.
- Change schema URIs, filenames, serialized envelope fields, gRPC services, and conformance identifiers only through separately documented wire-compatibility decisions. A package rename does not authorize an implicit wire rename.
- Resolve the repository's existing `spec_version` versus `aep_version` inconsistency before moving any version-validation code.
- Publish a per-language migration guide and a matrix listing every removed legacy surface, its Harmovela replacement, and the breaking-release version.

## Migration Sequence

1. Repair baseline TypeScript tests and apply the approved roadmap corrections. Neither changes the public module layout.
2. Publish the compatibility matrix and freeze Event contracts: envelope, unknown-event handling, session negotiation, registry ownership, transport identifiers, shared schemas, and conformance fixtures.
3. Create Harmovela Event and Governance modules in all four languages. Move implementations only behind contract tests that prove behavior preservation.
4. Create Recovery, Task, State, Context/Memory, and Delegation modules one dimension at a time in TypeScript, Python, Go, and Java. Each move adds shared conformance fixtures before public release.
5. Rename public SDK packages, CLIs, daemons, configuration, and endpoint surfaces as one coordinated major release after all required dimensions pass cross-language conformance.
6. Define and publish the Adaptation package only after the 0.5 feedback/outcome and budget semantics are stable.

## Testing And Acceptance Criteria

- Every dimension exports only documented contracts; imports between dimension internals are prohibited by language-appropriate dependency checks.
- Existing positive and negative shared fixtures retain equivalent behavior after each module move.
- New fixtures exist for each Coordination dimension before it claims profile support.
- All four language implementations pass the declared target conformance level and declared profiles after each migration phase.
- The breaking-release compatibility matrix covers package/artifact names, CLI/daemon names, config keys, environment variables, endpoint paths, schema/IDL identifiers, and wire fields.
- Documentation and generated artifacts use Harmovela as the public protocol identity; `aep` remains only where an explicit wire-compatibility decision retains it temporarily.

## Non-Goals

- This design does not add new protocol semantics.
- This design does not promise a universal AGI architecture.
- This design does not move Adaptation ahead of stable Coordination semantics.
- This design does not preserve public `aep` compatibility after the designated breaking release.

## Extraction Readiness

Before any dimension package may be extracted from a legacy implementation, the following preconditions must be met:

- Compatibility matrix has an approved decision for every public legacy surface touched by the extraction.
- Event and Governance contract fixtures pass in all four languages.
- The dimension's public contract, dependencies, profile relationship, and fixture ownership are documented.
- The change has a language-specific migration plan and does not infer a Protocol release from package work.
