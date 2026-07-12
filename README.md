# Axisrobo AEP

> [ä¸­æ–‡æ–‡æ¡£ (Chinese)](README_zh.md) | [Spec Site](https://axisrobo.github.io/aep/)

**Agent Event Protocol (AEP)** is a proposed open protocol for asynchronous communication between large language model agents, tools, memory systems, context providers, environment observers, and multi-agent runtimes.

AEP is designed as the asynchronous counterpart to MCP. MCP is good at synchronous capability invocation: listing tools, calling tools, reading resources, and returning immediate results. AEP focuses on the communication patterns MCP does not naturally cover: event streams, long-running task lifecycle, background feedback, memory updates, context invalidation, durable delivery, replay, cancellation, and agent-to-agent coordination.

## About

AEP 0.1 draft is a multi-language protocol repository with:

- **17 protocol specifications** covering session, subscription, task, error, versioning, delivery, reliability, security, conformance, and transport layers
- **4 productized implementations** (TypeScript, Python, Go, Java) ï¿?each with runtime daemon, CLI, HTTP API, subscriptions, MCP bridge, and delivery stores
- **~700 tests** across four languages, all passing
- **7 transport bindings** (stdio, WebSocket, SSE, gRPC, NATS, Kafka, Redis Streams) implemented across all languages
- **SQLite and PostgreSQL delivery stores** with retry, dead-letter, replay, and cross-language conformance
- **Spec site** at [axisrobo.github.io/aep](https://axisrobo.github.io/aep/)

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

- `docs/vision.md` -- project vision, goals, non-goals, and principles ([ÖÐÎÄ](docs/zh/vision.md))
- `docs/architecture.md` -- system architecture and major protocol layers ([ÖÐÎÄ](docs/zh/architecture.md))
- `docs/differentiation.md` ï¿?non-normative positioning and comparison material
- `docs/protocol-design.md` -- initial protocol model, envelope, events, and lifecycle ([ÖÐÎÄ](docs/zh/protocol-design.md))
- `docs/mcp-relationship.md` ï¿?detailed comparison and interop model with MCP
- `docs/roadmap.md` ï¿?proposed phases toward a usable open protocol
- `docs/specs/session.md` ï¿?session lifecycle specification
- `docs/specs/subscription.md` ï¿?subscription model specification
- `docs/specs/task-lifecycle.md` ï¿?task lifecycle specification
- `docs/specs/error-model.md` ï¿?error model specification
- `docs/specs/versioning.md` ï¿?versioning rules specification
- `docs/specs/transport-stdio.md` ï¿?stdio transport specification
- `docs/specs/transport-websocket.md` ï¿?WebSocket transport specification
- `docs/specs/transport-sse.md` ï¿?HTTP SSE transport specification
- `docs/specs/transport-grpc.md` ï¿?gRPC streaming transport specification
- `docs/specs/delivery.md` ï¿?delivery semantics, acknowledgement, and replay specification
- `docs/specs/reliability.md` ï¿?retry, durability, and dead-letter handling specification
- `docs/specs/security.md` ï¿?identity, authorization, audit, and tenant isolation specification
- `docs/specs/conformance.md` ï¿?draft conformance levels and shared fixture manifest rules
- `docs/specs/event-registry-governance.md` ï¿?event type registry governance and versioning
- `docs/specs/agent-runtime-semantics.md` ï¿?belief, freshness, delegation, interruption, and provenance metadata
- `CONTRIBUTING.md` ï¿?contribution guide and repository conventions
- `CODE_OF_CONDUCT.md` ï¿?contributor code of conduct

## Repository Layout

- `docs/` ï¿?protocol vision, architecture, design drafts, specifications, roadmap, and Superpowers artifacts
- `docs/specs/` ï¿?per-layer protocol specifications (session, subscription, task lifecycle, error model, versioning)
- `schemas/` ï¿?shared draft JSON Schema assets
- `conformance/` ï¿?shared fixtures for reference implementation parity
- `implementations/` ï¿?language-specific reference implementations
- `implementations/typescript/` ï¿?primary TypeScript implementation (SDK, `aepd` daemon, `aep` CLI, HTTP API)
- `implementations/python/` ï¿?Python implementation (SDK, daemon, CLI, HTTP API)
- `implementations/go/` ï¿?Go implementation (SDK, daemon, CLI, HTTP API, sub-package layout)
- `implementations/java/` ï¿?Java implementation (SDK, daemon, CLI, HTTP API, JDK 21)
- `examples/` -- scene-based examples: quickstart, service-client, mcp-bridge, scenarios
- `.github/workflows/` -- repository CI

## Development Harness

This project uses Superpowers as its agent development harness. OpenCode loads it through `opencode.json`; durable specs and plans live under `.superpowers/`.

- `AGENTS.md` ï¿?OpenCode project rules
- `CLAUDE.md` ï¿?Claude Code project rules
- `.superpowers/specs/` ï¿?Superpowers-backed design specs
- `.superpowers/plans/` ï¿?Superpowers-backed execution plans

## AEP Harness

The repository includes a minimal local AEP 0.1 draft conformance harness that uses newline-delimited JSON over stdio.

Run tests:

```sh
cd implementations/typescript && npm install
cd implementations/typescript && npm test
```

Run TypeScript conformance fixtures:

```sh
cd implementations/typescript && npm run conformance
```

Run cross-language conformance:

```sh
node tools/conformance-runner.js
```

This runs shared fixtures across all four language references and prints a unified pass/fail matrix.

Run the stdio harness:

```sh
cd implementations/typescript && npm run harness < ../../conformance/fixtures/task-lifecycle.ndjson
```

Run examples:

See `examples/` ï¿?organized by scene: quickstart, service-client, mcp-bridge, scenarios. Each file is language-suffixed.

```sh
# TypeScript quickstart
node examples/quickstart/runtime-embed.js

# Python quickstart
PYTHONPATH=implementations/python/src python examples/quickstart/runtime-embed.py

# Go quickstart (from the Go module root)
cd implementations/go && go run ../../examples/quickstart/runtime-embed.go

# MCP bridge
node examples/mcp-bridge/async-tool.js
```

## Spec Site

The rendered specification is published at **[https://axisrobo.github.io/aep/](https://axisrobo.github.io/aep/)**.

## Status

AEP is a draft open protocol with four active reference implementations (TypeScript, Python, Go, Java) maintaining cross-language parity. The repo includes layered specifications for session, subscription, task lifecycle, error model, versioning, conformance, delivery, reliability, security, event registry governance, and four transport bindings (stdio, WebSocket, SSE, gRPC). Each reference supports SQLite-backed delivery stores, and a cross-language conformance runner (`node tools/conformance-runner.js`) validates shared fixtures across all four languages.
