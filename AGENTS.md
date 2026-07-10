# Axisrobo AEP

OpenCode project rules file. Claude Code reads `CLAUDE.md`. Keep both aligned.

## Harness

Use Superpowers as the project development harness.

Superpowers is enabled through `opencode.json` and project work artifacts live under `.superpowers/`.

Use Superpowers workflows for planning, test-driven development, systematic debugging, verification, and code review.

## Project Scope

Axisrobo AEP defines the Agent Event Protocol: an asynchronous event layer for agents, tools, memory systems, context providers, environment observers, and multi-agent runtimes.

AEP complements MCP. MCP remains the synchronous call layer; AEP is the asynchronous event, subscription, lifecycle, and coordination layer.

## Current Status

This repository is currently a design draft. Treat protocol behavior as provisional unless a document explicitly marks it as stable.

## Primary Documents

| Document | Content |
| --- | --- |
| `README.md` | Project overview and document index |
| `docs/vision.md` | Vision, goals, non-goals, principles |
| `docs/architecture.md` | Architecture, components, protocol layers |
| `docs/protocol-design.md` | Envelope, event families, lifecycle, subscriptions |
| `docs/mcp-relationship.md` | MCP comparison and interop model |
| `docs/roadmap.md` | Milestones toward a usable open protocol |
| `docs/specs/session.md` | Session lifecycle specification |
| `docs/specs/subscription.md` | Subscription model specification |
| `docs/specs/task-lifecycle.md` | Task lifecycle specification |
| `docs/specs/error-model.md` | Error model specification |
| `docs/specs/versioning.md` | Versioning rules specification |
| `docs/specs/transport-stdio.md` | stdio transport specification |
| `docs/specs/transport-websocket.md` | WebSocket transport specification |
| `docs/specs/transport-sse.md` | HTTP SSE transport specification |
| `docs/specs/transport-grpc.md` | gRPC streaming transport specification |
| `docs/specs/delivery.md` | Delivery semantics, ack protocol, replay |
| `docs/specs/reliability.md` | Retry policy, dead-letter, durability |
| `docs/specs/security.md` | Identity, authorization, audit, tenant isolation |
| `docs/specs/conformance.md` | Conformance levels and test manifest specification |
| `docs/specs/event-registry-governance.md` | Event type registry governance and versioning |
| `docs/superpowers/specs/` | Superpowers-backed design specs |
| `docs/superpowers/plans/` | Superpowers-backed execution plans |
| `schemas/` | Shared draft JSON Schema assets |
| `conformance/fixtures/` | Shared cross-language conformance fixtures |
| `reference/typescript/` | Primary runnable reference harness |
| `reference/python/` | Second-priority Python reference implementation |
| `reference/go/` | Go reference implementation with C0/C1 conformance |
| `reference/java/` | Java reference implementation with C0/C1 conformance (JDK 21) |
| `reference/typescript/src/bridge/` | MCP bridge and async tool handler |

## Working Rules

- Keep the protocol core small and implementation-neutral.
- Prefer stable JSON envelope fields over transport-specific behavior.
- Keep language implementations under `reference/<language>/`.
- Keep shared schemas and conformance fixtures outside language-specific directories.
- Prioritize TypeScript first, Python second, then Go and Java.
- Do not introduce production guarantees beyond the documented delivery semantics.
- Update the relevant spec or plan when implementation direction changes.

## Verification

For documentation-only changes, verify by reviewing links and terminology consistency.

For TypeScript reference changes, run `cd reference/typescript && npm test` and record verification in the related Superpowers plan.
