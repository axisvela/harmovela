# Axisrobo AEP

**Agent Event Protocol (AEP)** is a proposed open protocol for asynchronous communication between large language model agents, tools, memory systems, context providers, environment observers, and multi-agent runtimes.

AEP is designed as the asynchronous counterpart to MCP. MCP is good at synchronous capability invocation: listing tools, calling tools, reading resources, and returning immediate results. AEP focuses on the communication patterns MCP does not naturally cover: event streams, long-running task lifecycle, background feedback, memory updates, context invalidation, durable delivery, replay, cancellation, and agent-to-agent coordination.

## Vision

Agents should not only ask for capabilities. They also need to listen, react, coordinate, and recover.

AEP defines a common event model so that agents can receive asynchronous feedback from tools, other agents, memory systems, external environments, and runtime infrastructure without forcing every system to invent a custom callback, polling, or message queue interface.

## Scope

AEP covers:

- Asynchronous events and notifications
- Publish / subscribe communication
- Long-running tool and task lifecycle
- Progress, output, completion, failure, cancellation, and timeout events
- Context and memory change streams
- Environment observation streams
- Agent-to-agent messages
- Delivery acknowledgement, replay, and correlation
- Transport bindings for local and distributed runtimes

AEP does not replace:

- MCP synchronous tool invocation
- LLM completion APIs
- Vector database APIs
- Business-specific memory schemas
- General-purpose message brokers

## Relationship To MCP

| MCP | AEP |
| --- | --- |
| Synchronous request / response | Asynchronous event streams |
| Tool invocation | Task lifecycle and tool feedback |
| Resource reading | Context updates and invalidation |
| Client-driven calls | Producer-driven events |
| Immediate result | Deferred, incremental, replayable results |

AEP should interoperate with MCP rather than fork it. AEP can carry events about MCP tool calls, but it should remain protocol-independent enough to support non-MCP agents, tools, memory systems, robotics systems, browsers, IDEs, and cloud runtimes.

## Documents

- `docs/vision.md` — project vision, goals, non-goals, and principles
- `docs/architecture.md` — system architecture and major protocol layers
- `docs/protocol-design.md` — initial protocol model, envelope, events, and lifecycle
- `docs/mcp-relationship.md` — detailed comparison and interop model with MCP
- `docs/roadmap.md` — proposed phases toward a usable open protocol
- `docs/specs/session.md` — session lifecycle specification
- `docs/specs/subscription.md` — subscription model specification
- `docs/specs/task-lifecycle.md` — task lifecycle specification
- `docs/specs/error-model.md` — error model specification
- `docs/specs/versioning.md` — versioning rules specification

## Repository Layout

- `docs/` — protocol vision, architecture, design drafts, specifications, roadmap, and Superpowers artifacts
- `docs/specs/` — per-layer protocol specifications (session, subscription, task lifecycle, error model, versioning)
- `schemas/` — shared draft JSON Schema assets
- `conformance/` — shared fixtures for reference implementation parity
- `reference/` — language-specific reference implementations
- `reference/typescript/` — first runnable AEP draft harness
- `reference/python/` — planned second-priority reference implementation
- `reference/go/` — planned infrastructure-oriented reference implementation
- `reference/java/` — planned JVM reference implementation
- `.github/workflows/` — repository CI

## Development Harness

This project uses Superpowers as its agent development harness. OpenCode loads it through `opencode.json`; durable specs and plans live under `docs/superpowers/`.

- `AGENTS.md` — OpenCode project rules
- `CLAUDE.md` — Claude Code project rules
- `docs/superpowers/specs/` — Superpowers-backed design specs
- `docs/superpowers/plans/` — Superpowers-backed execution plans

## AEP Harness

The repository includes a minimal local AEP 0.1 draft conformance harness. It is intentionally zero-dependency and uses newline-delimited JSON over stdio.

Run tests:

```sh
cd reference/typescript && npm test
```

Run the stdio harness:

```sh
cd reference/typescript && npm run harness < ../../conformance/fixtures/task-lifecycle.ndjson
```

The harness currently validates draft envelope fields, checks event types against the standard registry, creates subscriptions, acknowledges valid events, and rejects invalid envelopes.

## Status

This repository currently contains the initial vision and design documents. The protocol is not yet finalized and should be treated as a design draft.
