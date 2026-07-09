# Axisrobo AEP

OpenCode project rules file. Claude Code reads `CLAUDE.md`. Keep both aligned.

## Harness

Use Superpowers as the project development harness.

Superpowers is enabled through `opencode.json` and project work artifacts live under `docs/superpowers/`.

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
| `docs/superpowers/specs/` | Superpowers-backed design specs |
| `docs/superpowers/plans/` | Superpowers-backed execution plans |
| `schemas/` | Shared draft JSON Schema assets |
| `conformance/fixtures/` | Shared cross-language conformance fixtures |
| `reference/typescript/` | Primary runnable reference harness |
| `reference/python/` | Planned Python reference implementation |
| `reference/go/` | Planned Go reference implementation |
| `reference/java/` | Planned Java reference implementation |
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
