# Harmovela Protocol Design

Date: 2026-07-12
Status: approved

## Identity

**Harmovela Protocol** is the protocol's formal working name.

Harmovela is an open coordination protocol for autonomous systems. It defines interoperable asynchronous coordination across tasks, events, state, context, memory, delegation, recovery, and governance.

Axisrobo is the founding implementation organization. The Harmovela protocol is designed for multi-party adoption and open governance. Its canonical repository location is `https://github.com/axisrobo/harmovela`.

## Scope

The protocol evolves as one coherent coordination model while delivering capability in stages:

| Area | Responsibility |
| --- | --- |
| Event | Publish, subscribe, correlate, replay, and acknowledge asynchronous changes. |
| Task | Represent accepted, running, blocked, completed, failed, cancelled, and timed-out work. |
| State | Communicate versioned state, freshness, invalidation, and recovery-relevant changes. |
| Context and memory | Communicate availability, updates, invalidation, provenance, and trust metadata. |
| Delegation | Represent work assignment, acceptance, handoff, escalation, and cancellation propagation. |
| Recovery | Support idempotency, replay, checkpoints, interruption, and compensation. |
| Governance | Define identity, authorization, audit, tenant boundaries, and policy integration points. |

The protocol does not define a general intelligence model, a universal ontology, an LLM inference API, a message broker, or application-specific business schemas.

## Compatibility

The existing 0.1 draft implementation remains the compatibility baseline during the transition. Naming changes must not silently alter wire behavior, delivery guarantees, or conformance claims.

Protocol identity, schema identifiers, package artifact names, repository paths, and public documentation are migrated through versioned releases. The Axisrobo package and group namespace remains unchanged. Compatibility aliases, when required, must have explicit ownership, duration, and removal criteria.

### 0.2 Breaking Identifier Migration

Harmovela 0.2 performs a clean breaking migration of public protocol identifiers. It does not accept or emit legacy AEP aliases.

| 0.1 identifier | 0.2 identifier |
| --- | --- |
| `aep_version` | `spec_version` |
| `AEP-C0` through `AEP-C3` | `HARMOVELA-C0` through `HARMOVELA-C3` |
| `/aep` transport paths | `/harmovela` transport paths |
| `aep.*` broker names and headers | `harmovela.*` broker names and headers |
| `aep.config.json` and `.aep/` | `harmovela.config.json` and `.harmovela/` |
| `AEP_CONFIG` | `HARMOVELA_CONFIG` |

Axisrobo remains the package and group namespace. The transition must not replace `axisrobo` with `harmovela` in package or group identifiers.

## Governance Direction

The project will publish a contribution process, event registry process, compatibility policy, and release policy before a 1.0 release. Protocol decisions must be documented in public specifications and validated by conformance fixtures.

## Release Direction

- **0.1 transition:** Establish the Harmovela public identity while preserving the current draft baseline.
- **0.2 core stabilization:** Freeze the minimal coordination core and resolve specification consistency gaps.
- **0.3 profiles:** Add optional profiles for runtime semantics, transport capabilities, and governance extensions without expanding the required core.
- **0.5 beta:** Require independent interoperability evidence and stable beta compatibility.
- **0.9 RC:** Restrict changes to release-blocking corrections and interoperability fixes.
- **1.0:** Publish only after the core, governance process, conformance suite, and implementation evidence meet the documented release gates.
