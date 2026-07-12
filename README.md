# Axisrobo AEP

**Agent Event Protocol (AEP)** is a proposed open protocol for asynchronous communication between large language model agents, tools, memory systems, context providers, environment observers, and multi-agent runtimes.

AEP is designed as the asynchronous counterpart to MCP. MCP is good at synchronous capability invocation: listing tools, calling tools, reading resources, and returning immediate results. AEP focuses on the communication patterns MCP does not naturally cover: event streams, long-running task lifecycle, background feedback, memory updates, context invalidation, durable delivery, replay, cancellation, and agent-to-agent coordination.

## About

AEP 0.1 draft is a multi-language protocol repository with:

- **17 protocol specifications** covering session, subscription, task, error, versioning, delivery, reliability, security, conformance, and transport layers
- **4 reference implementations** (TypeScript, Python, Go, Java) with cross-language conformance verified against shared fixtures
- **4 transport bindings** (stdio, WebSocket, SSE, gRPC) implemented across all languages
- **SQLite-backed delivery stores** with retry, dead-letter, and replay support in every language
- **~320 tests** across four languages, all passing
- **Spec site** at [axisrobo.github.io/aep](https://axisrobo.github.io/aep/)

[ä¸­æ–‡æ–‡æ¡£](README_zh.md)

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

- `docs/vision.md` â€?project vision, goals, non-goals, and principles
- `docs/architecture.md` â€?system architecture and major protocol layers
- `docs/differentiation.md` â€?non-normative positioning and comparison material
- `docs/protocol-design.md` â€?initial protocol model, envelope, events, and lifecycle
- `docs/mcp-relationship.md` â€?detailed comparison and interop model with MCP
- `docs/roadmap.md` â€?proposed phases toward a usable open protocol
- `docs/specs/session.md` â€?session lifecycle specification
- `docs/specs/subscription.md` â€?subscription model specification
- `docs/specs/task-lifecycle.md` â€?task lifecycle specification
- `docs/specs/error-model.md` â€?error model specification
- `docs/specs/versioning.md` â€?versioning rules specification
- `docs/specs/transport-stdio.md` â€?stdio transport specification
- `docs/specs/transport-websocket.md` â€?WebSocket transport specification
- `docs/specs/transport-sse.md` â€?HTTP SSE transport specification
- `docs/specs/transport-grpc.md` â€?gRPC streaming transport specification
- `docs/specs/delivery.md` â€?delivery semantics, acknowledgement, and replay specification
- `docs/specs/reliability.md` â€?retry, durability, and dead-letter handling specification
- `docs/specs/security.md` â€?identity, authorization, audit, and tenant isolation specification
- `docs/specs/conformance.md` â€?draft conformance levels and shared fixture manifest rules
- `docs/specs/event-registry-governance.md` â€?event type registry governance and versioning
- `docs/specs/agent-runtime-semantics.md` â€?belief, freshness, delegation, interruption, and provenance metadata
- `CONTRIBUTING.md` â€?contribution guide and repository conventions
- `CODE_OF_CONDUCT.md` â€?contributor code of conduct

## Repository Layout

- `docs/` â€?protocol vision, architecture, design drafts, specifications, roadmap, and Superpowers artifacts
- `docs/specs/` â€?per-layer protocol specifications (session, subscription, task lifecycle, error model, versioning)
- `schemas/` â€?shared draft JSON Schema assets
- `conformance/` â€?shared fixtures for reference implementation parity
- `implementations/` â€?language-specific reference implementations
- `implementations/typescript/` â€?primary runnable AEP reference implementation
- `implementations/python/` â€?second-priority reference implementation with full transport and delivery support
- `implementations/go/` â€?Go reference implementation with C0/C1 conformance
- `implementations/java/` â€?Java reference implementation with C0/C1 conformance (JDK 21)
- `.github/workflows/` â€?repository CI

## Development Harness

This project uses Superpowers as its agent development harness. OpenCode loads it through `opencode.json`; durable specs and plans live under `.superpowers/`.

- `AGENTS.md` â€?OpenCode project rules
- `CLAUDE.md` â€?Claude Code project rules
- `.superpowers/specs/` â€?Superpowers-backed design specs
- `.superpowers/plans/` â€?Superpowers-backed execution plans

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

```sh
cd implementations/typescript && npm run demo:async-tool
cd implementations/typescript && npm run demo:memory
cd implementations/typescript && npm run demo:agent
cd implementations/typescript && npm run demo:mcp-bridge
cd implementations/typescript && npm run demo:mcp-aep-consumer
cd implementations/typescript && npm run demo:production-e2e
```

The harness validates draft envelope fields, checks event types against the standard registry, creates subscriptions, tracks task lifecycle, supports stdio/WebSocket/SSE transports, validates shared JSON Schemas, and demonstrates MCP interop.

## Spec Site

The rendered specification is published at **[https://axisrobo.github.io/aep/](https://axisrobo.github.io/aep/)**.

## Status

AEP is a draft open protocol with four active reference implementations (TypeScript, Python, Go, Java) maintaining cross-language parity. The repo includes layered specifications for session, subscription, task lifecycle, error model, versioning, conformance, delivery, reliability, security, event registry governance, and four transport bindings (stdio, WebSocket, SSE, gRPC). Each reference supports SQLite-backed delivery stores, and a cross-language conformance runner (`node tools/conformance-runner.js`) validates shared fixtures across all four languages.
