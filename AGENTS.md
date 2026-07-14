# Harmovela Protocol

OpenCode project rules file. Claude Code reads `CLAUDE.md`. Keep both aligned.

## Harness

Use Superpowers as the project development harness.

Superpowers is enabled through `opencode.json` and project work artifacts live under `.superpowers/`.

Use Superpowers workflows for planning, test-driven development, systematic debugging, verification, and code review.

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

Harmovela complements MCP. MCP remains the synchronous capability invocation layer; Harmovela provides asynchronous event, subscription, lifecycle, state, recovery, and coordination semantics.

The canonical repository location is `https://github.com/axisrobo/harmovela`.

## Naming And Namespace Rules

- Harmovela is the public protocol identity.
- Axisrobo remains the implementation organization and package namespace. Do not replace `axisrobo` package or group namespaces with `harmovela`.
- Migrate public artifact names, repository paths, wire identifiers, configuration names, and transport defaults only through an explicit versioned compatibility decision.
- Do not change protocol behavior, delivery guarantees, or conformance claims as a side effect of a naming migration.
- New domain implementation must live in its Harmovela dimension module (Event, Task, State, Context/Memory, Delegation, Recovery, or Governance), not under a legacy `aep` namespace. Legacy `aep` code may only adapt to public dimension contracts and must not be a dependency of a dimension module.

## Current Status

Active protocol development with 4 reference implementations (TypeScript, Python, Go, Java), 10+ dimension modules, and cross-language conformance.

## Primary Documents

| Document | Content |
| --- | --- |
| `README.md` | Project overview and document index |
| `docs/vision.md` | Vision, goals, non-goals, principles |
| `docs/architecture.md` | Architecture, components, protocol layers |
| `docs/protocol-design.md` | Envelope, event families, lifecycle, subscriptions |
| `docs/mcp-relationship.md` | MCP comparison and interop model |
| `docs/roadmap.md` | Milestones toward a usable open protocol |
| `docs/protocol/session.md` | Session lifecycle specification |
| `docs/protocol/subscription.md` | Subscription model specification |
| `docs/protocol/task-lifecycle.md` | Task lifecycle specification |
| `docs/protocol/error-model.md` | Error model specification |
| `docs/protocol/versioning.md` | Versioning rules specification |
| `docs/protocol/transport-stdio.md` | stdio transport specification |
| `docs/protocol/transport-websocket.md` | WebSocket transport specification |
| `docs/protocol/transport-sse.md` | HTTP SSE transport specification |
| `docs/protocol/transport-grpc.md` | gRPC streaming transport specification |
| `docs/protocol/delivery.md` | Delivery semantics, ack protocol, replay |
| `docs/protocol/reliability.md` | Retry policy, dead-letter, durability |
| `docs/protocol/security.md` | Identity, authorization, audit, tenant isolation |
| `docs/protocol/conformance.md` | Conformance levels and test manifest specification |
| `docs/protocol/event-registry-governance.md` | Event type registry governance and versioning |
| `docs/design/` | Superpowers-backed design specs |
| `docs/design/` | Superpowers-backed execution plans |
| `schemas/` | Shared draft JSON Schema assets |
| `conformance/fixtures/` | Shared cross-language conformance fixtures |
| `implementations/typescript/` | Primary TypeScript implementation (SDK, daemon, CLI, HTTP API) |
| `implementations/python/` | Python implementation (SDK, daemon, CLI, HTTP API) |
| `implementations/go/` | Go implementation (SDK, daemon, CLI, HTTP API, sub-packages) |
| `implementations/java/` | Java implementation (SDK, daemon, CLI, HTTP API, JDK 21) |
| `implementations/typescript/src/bridge/` | MCP bridge and async tool handler |
| `examples/` | Scene-based examples (quickstart, service-client, mcp-bridge, scenarios) |

## Working Rules

- Keep the protocol core small and implementation-neutral.
- Prefer stable JSON envelope fields over transport-specific behavior.
- Keep language implementations under `implementations/<language>/`.
- Keep shared schemas and conformance fixtures outside language-specific directories.
- Prioritize TypeScript first, Python second, then Go and Java.
- Do not introduce production guarantees beyond the documented delivery semantics.
- Update the relevant spec or plan when implementation direction changes.
- Keep `AGENTS.md` and `CLAUDE.md` aligned when changing project identity or harness rules.

## Verification

For documentation-only changes, verify by reviewing links and terminology consistency.

For TypeScript reference changes, run `cd implementations/typescript && npm test` and record verification in the related Superpowers plan.
