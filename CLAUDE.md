# Harmovela Protocol

Claude Code project rules file. OpenCode reads `AGENTS.md`. Keep both aligned.

## Harness

Use Superpowers as the project development harness. Superpowers is enabled through `opencode.json`, and project work artifacts live under `.superpowers/`.

Before changing any version or delivery-status statement in a roadmap, release record, profile, schema, wire identifier, package, or conformance claim, load and follow `.superpowers/skills/harmovela-version-governance/SKILL.md`. Do not use historical release/status documents as evidence for future version gates.

## Project Identity

Harmovela Protocol is an open coordination protocol for autonomous systems across all 7 coordination dimensions:

| Dimension | Concern |
| --- | --- |
| Event | What changed (typed, correlatable event envelopes) |
| Task | Work in flight (lifecycle from submission through completion) |
| State | Current known truth (snapshots and incremental deltas) |
| Context / Memory | Cognitive decisions (facts, episodes, invalidation) |
| Delegation | Work assignment across agents (ownership and handoff) |
| Recovery | Resilience (retry, dead-letter, replay, durability) |
| Governance | Who may do what (identity, authorization, audit) |

Harmovela complements MCP. MCP is the synchronous capability invocation layer; Harmovela provides asynchronous event, subscription, lifecycle, state, recovery, and coordination semantics.

Harmovela is a coordination protocol, not a platform. It defines the semantics for events, tasks, state, delegation, recovery, and governance. Capability registries, planning engines, agent runtimes, workflow engines, and governance dashboards are platform concerns that consume the protocol — they are not protocol features. See `design/vision.md` for the full non-goals list.

The canonical repository location is `https://github.com/axisrobo/harmovela`.

## Naming And Namespace Rules

- Harmovela is the public protocol identity.
- Axisrobo remains the implementation organization and package namespace. Do not replace `axisrobo` package or group namespaces with `harmovela`.
- Migrate public artifact names, repository paths, wire identifiers, configuration names, and transport defaults only through an explicit versioned compatibility decision.
- Do not change protocol behavior, delivery guarantees, or conformance claims as a side effect of a naming migration.
- New domain implementation must live in its Harmovela dimension module (Event, Task, State, Context/Memory, Delegation, Recovery, or Governance), not under a legacy `aep` namespace. Legacy `aep` code may only adapt to public dimension contracts and must not be a dependency of a dimension module.

## Primary Documents

| Document | Content |
| --- | --- |
| `README.md` | Project overview and document index |
| `design/vision.md` | Vision, goals, non-goals, principles |
| `design/architecture.md` | Architecture, components, protocol layers |
| `design/protocol-design.md` | Envelope, event families, lifecycle, subscriptions |
| `design/mcp-relationship.md` | MCP comparison and interop model |
| `design/roadmap.md` | Milestones toward a usable open protocol |
| `design/protocol/session.md` | Session lifecycle specification |
| `design/protocol/subscription.md` | Subscription model specification |
| `design/protocol/task-lifecycle.md` | Task lifecycle specification |
| `design/protocol/error-model.md` | Error model specification |
| `design/protocol/versioning.md` | Versioning rules specification |
| `design/protocol/transport-stdio.md` | stdio transport specification |
| `design/protocol/transport-websocket.md` | WebSocket transport specification |
| `design/protocol/transport-sse.md` | HTTP SSE transport specification |
| `design/protocol/transport-grpc.md` | gRPC streaming transport specification |
| `design/protocol/delivery.md` | Delivery semantics, ack protocol, replay |
| `design/protocol/reliability.md` | Retry policy, dead-letter, durability |
| `design/protocol/security.md` | Identity, authorization, audit, tenant isolation |
| `design/protocol/conformance.md` | Conformance levels and test manifest specification |
| `design/protocol/event-registry-governance.md` | Event type registry governance and versioning |
| `design/design/` | Superpowers-backed design specs |
| `design/design/` | Superpowers-backed execution plans |
| `schemas/` | Shared draft JSON Schema assets |
| `conformance/fixtures/` | Shared cross-language conformance fixtures |
| `implementations/typescript/` | Primary TypeScript implementation (SDK, daemon, CLI, HTTP API) |
| `implementations/python/` | Python implementation (SDK, daemon, CLI, HTTP API) |
| `implementations/go/` | Go implementation (SDK, daemon, CLI, HTTP API, sub-packages) |
| `implementations/java/` | Java implementation (SDK, daemon, CLI, HTTP API, JDK 21) |
| `implementations/typescript/src/bridge/` | MCP bridge and async tool handler |
| `examples/` | Scene-based examples (quickstart, service-client, mcp-bridge, scenarios) |

## Verification

For documentation-only changes, verify links and terminology consistency. For TypeScript reference changes, run `cd implementations/typescript && npm test` and record verification in the related Superpowers plan.

Keep `CLAUDE.md` and `AGENTS.md` aligned when changing project identity or harness rules.
